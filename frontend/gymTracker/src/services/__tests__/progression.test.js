import { describe, it, expect, beforeEach } from 'vitest'
import {
    sessionXp,
    totalXp,
    analyzeSession,
    mergePrs,
    computePrsFromSessions,
    rankForXp,
    xpThresholdForLevel,
    MAX_LEVEL,
    exerciseRankForScore,
    computeExerciseRanks,
    strengthScore,
    durationScore,
    weekKeyFor,
    planFreezeProtection,
    computeStreakWithFreezes,
    computeProgress,
    getFreezeState,
    saveFreezeState,
    applyFreezeProtection,
    getProgressionState,
    saveProgressionState,
    refreshProgress,
    challengesForLevel,
    challengeStatusForLevel,
    challengeEligibleLevel,
    getStartRank,
    saveStartRank
} from '../progression'
import { createSession } from '../storage'
import { resetDb } from '../../test/resetDb'

beforeEach(resetDb)

let idCounter = 0
const nextId = () => `s-${++idCounter}`

const weightSession = (name = 'Bench', weight = 60, reps = 10, id) => ({
    id: id || nextId(),
    name: 'Workout',
    exercises: [{ name, mode: 'weight', sets: [{ reps: String(reps), weight: `${weight}kg` }] }]
})

const timerSession = (name = 'Plank', duration = 60, id) => ({
    id: id || nextId(),
    name: 'Workout',
    exercises: [{ name, mode: 'timer', sets: [{ reps: String(duration) }] }]
})

describe('session XP', () => {
    it('gives a flat 20 XP base for every session regardless of size', () => {
        expect(sessionXp({ id: 'a', exercises: [] })).toBe(20)
        expect(sessionXp({ id: 'b', exercises: [{ name: 'A', sets: [{ reps: '—' }] }] })).toBe(20)
        expect(sessionXp({ id: 'c', exercises: [{ name: 'A', sets: [] }] })).toBe(20)
    })

    it('gives +10 for a first-time weight (new PR)', () => {
        expect(sessionXp(weightSession('Bench', 60, 10), [])).toBe(30)
    })

    it('gives no bonus for repeating an existing weight', () => {
        const prev = weightSession('Bench', 60, 10)
        const now = weightSession('Bench', 60, 10)
        expect(sessionXp(now, [prev])).toBe(20)
    })

    it('gives +10 for beating the heaviest weight on an exercise', () => {
        const prev = weightSession('Bench', 60, 10)
        const now = weightSession('Bench', 65, 8)
        expect(sessionXp(now, [prev])).toBe(30)
    })

    it('gives +5 for beating reps at the same weight', () => {
        const prev = weightSession('Bench', 60, 8)
        const now = weightSession('Bench', 60, 10)
        expect(sessionXp(now, [prev])).toBe(25)
    })

    it('does not stack PR and extra-rep bonuses (only the bigger one)', () => {
        const prev = weightSession('Bench', 60, 8)
        const now = weightSession('Bench', 65, 12)
        expect(sessionXp(now, [prev])).toBe(30)
    })

    it('tracks rep records per specific weight', () => {
        const prev = {
            id: 'h1',
            exercises: [
                { name: 'DB Press', mode: 'weight', sets: [
                    { reps: '8', weight: '20kg' },
                    { reps: '5', weight: '25kg' }
                ] }
            ]
        }
        // 6 reps at 25kg beats the 5 recorded at 25kg, but 25kg is not a new
        // heaviest weight → extra rep bonus, not a PR.
        const now = {
            id: 'h2',
            exercises: [
                { name: 'DB Press', mode: 'weight', sets: [{ reps: '6', weight: '25kg' }] }
            ]
        }
        expect(sessionXp(now, [prev])).toBe(25)
    })

    it('gives +10 for beating a timer duration record', () => {
        expect(sessionXp(timerSession('Plank', 60), [])).toBe(30)
        expect(sessionXp(timerSession('Plank', 60), [timerSession('Plank', 60)])).toBe(20)
        expect(sessionXp(timerSession('Plank', 90), [timerSession('Plank', 60)])).toBe(30)
    })

    it('gives a per-exercise bonus for each exercise that sets a record', () => {
        const session = {
            id: 'multi',
            exercises: [
                { name: 'Bench', mode: 'weight', sets: [{ reps: '10', weight: '60kg' }] },
                { name: 'Squat', mode: 'weight', sets: [{ reps: '8', weight: '80kg' }] }
            ]
        }
        expect(sessionXp(session, [])).toBe(20 + 10 + 10)
    })
})

describe('analyzeSession', () => {
    it('returns the base, bonuses, total, and PRs to add', () => {
        const prev = weightSession('Bench', 60, 8)
        const now = weightSession('Bench', 65, 10)
        const out = analyzeSession(now, [prev])
        expect(out.base).toBe(20)
        expect(out.xp).toBe(30)
        expect(out.bonuses).toHaveLength(1)
        expect(out.bonuses[0]).toMatchObject({ type: 'weight-pr', points: 10, name: 'Bench', value: 65, reps: 10 })
        expect(out.newPrs).toEqual([{ name: 'Bench', weight: '65', reps: '10' }])
    })

    it('returns no PRs for extra-rep bonuses', () => {
        const prev = weightSession('Bench', 60, 8)
        const now = weightSession('Bench', 60, 10)
        const out = analyzeSession(now, [prev])
        expect(out.bonuses[0].type).toBe('extra-rep')
        expect(out.newPrs).toEqual([])
    })
})

describe('computePrsFromSessions', () => {
    it('derives best weight + reps at that weight from sessions', () => {
        const sessions = [
            weightSession('Bench', 60, 10, 'a'),
            weightSession('Bench', 65, 8, 'b'),
            weightSession('Deadlift', 180, 5, 'c')
        ]
        expect(computePrsFromSessions(sessions)).toEqual([
            { name: 'Bench', weight: '65', reps: '8' },
            { name: 'Deadlift', weight: '180', reps: '5' }
        ])
    })

    it('returns nothing when the only session is removed', () => {
        const sessions = [weightSession('Bench', 65, 8, 'a')]
        const remaining = sessions.filter(s => s.id !== 'a')
        expect(computePrsFromSessions(remaining)).toEqual([])
    })
})

describe('mergePrs', () => {
    it('adds new entries', () => {
        expect(mergePrs([], [{ name: 'Deadlift', weight: '180', reps: '5' }])).toEqual([
            { name: 'Deadlift', weight: '180', reps: '5' }
        ])
    })

    it('upgrades an existing entry only when heavier', () => {
        const prs = [{ name: 'Bench', weight: '60', reps: '10' }]
        expect(mergePrs(prs, [{ name: 'Bench', weight: '65', reps: '8' }])[0]).toMatchObject({ weight: '65' })
        expect(mergePrs(prs, [{ name: 'Bench', weight: '55', reps: '12' }])[0]).toMatchObject({ weight: '60' })
    })

    it('is case-insensitive on names', () => {
        const merged = mergePrs([{ name: 'Bench', weight: '60', reps: '10' }], [{ name: 'bench', weight: '70', reps: '6' }])
        expect(merged).toHaveLength(1)
        expect(merged[0].weight).toBe('70')
    })
})

describe('player ranks', () => {
    it('starts at Rookie with no XP', () => {
        const rank = rankForXp(0)
        expect(rank.level).toBe(1)
        expect(rank.name).toBe('Rookie')
        expect(rank.progress).toBe(0)
        expect(rank.nextThreshold).toBe(xpThresholdForLevel(2))
    })

    it('carries the badge icon through', () => {
        expect(rankForXp(0).icon).toBe('/badge/rookie.png')
        expect(rankForXp(xpThresholdForLevel(3)).icon).toBe('/badge/learner.png')
    })

    it('levels up at each threshold and caps at max', () => {
        expect(rankForXp(xpThresholdForLevel(5) - 1).level).toBe(4)
        expect(rankForXp(xpThresholdForLevel(5)).level).toBe(5)
        expect(rankForXp(1e9).level).toBe(MAX_LEVEL)
        expect(rankForXp(1e9).nextThreshold).toBeNull()
        expect(rankForXp(1e9).progress).toBe(1)
    })

    it('computes a linear progress within the level', () => {
        const low = xpThresholdForLevel(3)
        const high = xpThresholdForLevel(4)
        expect(rankForXp(low).progress).toBe(0)
        expect(rankForXp(low + (high - low) / 2).progress).toBeCloseTo(0.5)
    })

    it('gives no bonus for repeating identical sessions', () => {
        const s1 = { id: 'x1', exercises: [
            { name: 'A', mode: 'weight', sets: [{ reps: '10', weight: '60kg' }] },
            { name: 'B', mode: 'weight', sets: [{ reps: '8', weight: '80kg' }] }
        ] }
        const s2 = { id: 'x2', exercises: [
            { name: 'A', mode: 'weight', sets: [{ reps: '10', weight: '60kg' }] },
            { name: 'B', mode: 'weight', sets: [{ reps: '8', weight: '80kg' }] }
        ] }
        expect(totalXp([s1, s2])).toBe(20 + 20)
    })

    it('rewards a progressive weight chain: rep records at each new weight + PR at the top', () => {
        // Each weight is new in history → +5 rep record at that weight. Only the
        // heaviest also earns the +10 PR (which supersedes the +5).
        const s1 = weightSession('Bench', 60, 10)
        const s2 = weightSession('Bench', 65, 8)
        const s3 = weightSession('Bench', 70, 6)
        expect(totalXp([s1, s2, s3])).toBe(20 + 5 + 20 + 5 + 30)
    })
})

describe('exercise ranks', () => {
    it('tiers by strength score', () => {
        expect(exerciseRankForScore(0).name).toBe('Wood')
        expect(exerciseRankForScore(0.3).name).toBe('Wood')
        expect(exerciseRankForScore(0.54).name).toBe('Wood')
        expect(exerciseRankForScore(0.55).name).toBe('Bronze')
        expect(exerciseRankForScore(0.8).name).toBe('Silver')
        expect(exerciseRankForScore(1.0).name).toBe('Gold')
        expect(exerciseRankForScore(1.25).name).toBe('Platinum')
        expect(exerciseRankForScore(1.5).name).toBe('Diamond')
        expect(exerciseRankForScore(2.0).name).toBe('Diamond')
        expect(exerciseRankForScore(2.0).nextScore).toBeNull()
    })

    it('scales weight against bodyweight and category factor', () => {
        expect(strengthScore({ weight: 70, bodyweight: 70, category: 'Chest' })).toBeCloseTo(1.0)
        expect(strengthScore({ weight: 14, bodyweight: 70, category: 'Biceps' })).toBeCloseTo(0.5)
        expect(strengthScore({ weight: 105, bodyweight: 70, category: 'Legs' })).toBeCloseTo(1.0)
        expect(strengthScore({ weight: 40, bodyweight: 0, category: 'Chest' })).toBe(0)
    })

    it('scores timer exercises by duration against category time factor', () => {
        expect(durationScore({ seconds: 90, category: 'Core' })).toBeCloseTo(1.0)
        expect(durationScore({ seconds: 600, category: 'Cardio' })).toBeCloseTo(1.0)
        expect(durationScore({ seconds: 0, category: 'Core' })).toBe(0)
    })

    it('uses heaviest weight hit for 8+ reps, ignores lighter/high-rep sets', () => {
        const session = {
            id: 'a',
            name: 'Workout',
            exercises: [
                {
                    name: 'Bench',
                    mode: 'weight',
                    category: 'Chest',
                    sets: [
                        { reps: '10', weight: '60kg' },
                        { reps: '5', weight: '90kg' },
                        { reps: '12', weight: '55kg' }
                    ]
                },
                { name: 'Plank', mode: 'timer', category: 'Core', sets: [{ reps: '120' }] }
            ]
        }
        const ranks = computeExerciseRanks([session], 70)
        const bench = ranks.find((r) => r.name === 'Bench')
        expect(bench.weight).toBe(60)
        expect(bench.rank.name).toBe('Silver')
        const plank = ranks.find((r) => r.name === 'Plank')
        expect(plank.duration).toBe(120)
        expect(plank.rank.name).toBe('Platinum')
        expect(ranks[0].name).toBe('Plank')
    })
})

describe('streak freezes', () => {
    const at = (iso) => ({ createdAt: iso })

    it('computes monday-anchored week keys', () => {
        expect(weekKeyFor(new Date('2026-08-12T12:00:00'))).toBe('2026-08-10')
        expect(weekKeyFor(new Date('2026-08-09T12:00:00'))).toBe('2026-08-03')
    })

    it('protects only the missed days right after the last workout', () => {
        const now = new Date('2026-08-14T12:00:00')
        const sessions = [at('2026-08-10T09:00:00'), at('2026-08-11T09:00:00')]
        const protect = planFreezeProtection(sessions, [], now, 2)
        expect(protect).toEqual(['2026-08-12', '2026-08-13'])
    })

    it('never protects Sundays (rest days) and stops at the first workout', () => {
        const now = new Date('2026-08-17T12:00:00') // Monday
        const sessions = [at('2026-08-14T09:00:00')] // Friday
        const protect = planFreezeProtection(sessions, [], now, 2)
        expect(protect).toEqual(['2026-08-15']) // Saturday only; Sunday is rest
    })

    it('protects nothing without workouts or freezes', () => {
        expect(planFreezeProtection([], [], new Date('2026-08-14T12:00:00'), 2)).toEqual([])
        expect(planFreezeProtection([at('2026-08-14T09:00:00')], [], new Date('2026-08-14T12:00:00'), 0)).toEqual([])
    })

    it('skips days that are already frozen', () => {
        const now = new Date('2026-08-14T12:00:00')
        const sessions = [at('2026-08-11T09:00:00')]
        expect(planFreezeProtection(sessions, ['2026-08-12'], now, 2)).toEqual(['2026-08-13'])
    })

    it('counts frozen days into the streak', () => {
        const now = new Date('2026-08-14T12:00:00')
        const sessions = [at('2026-08-10T09:00:00'), at('2026-08-11T09:00:00')]
        expect(computeStreakWithFreezes(sessions, [], now)).toBe(0)
        expect(computeStreakWithFreezes(sessions, ['2026-08-12', '2026-08-13'], now)).toBe(4)
    })

    it('does not let stale freezes extend a broken streak', () => {
        const now = new Date('2026-08-20T12:00:00')
        const sessions = [at('2026-08-10T09:00:00')]
        expect(computeStreakWithFreezes(sessions, ['2026-08-12'], now)).toBe(0)
    })

    it('persists freeze state', async () => {
        expect(await getFreezeState()).toEqual({ weekKey: null, frozenDays: [] })
        await saveFreezeState({ weekKey: '2026-08-10', frozenDays: ['2026-08-12'] })
        expect(await getFreezeState()).toEqual({ weekKey: '2026-08-10', frozenDays: ['2026-08-12'] })
    })

    it('applyFreezeProtection consumes freezes and resets the weekly allowance', async () => {
        await createSession({ name: 'W', createdAt: new Date('2026-08-11T09:00:00'), exercises: [] })
        const result = await applyFreezeProtection(new Date('2026-08-14T12:00:00'))
        expect(result.protectedDays).toEqual(['2026-08-12', '2026-08-13'])
        expect(result.available).toBe(0)
        expect(result.frozenDays).toEqual(['2026-08-12', '2026-08-13'])

        const again = await applyFreezeProtection(new Date('2026-08-14T12:00:00'))
        expect(again.protectedDays).toEqual([])
    })
})

describe('computeProgress / refreshProgress', () => {
    const iso = (s) => ({ name: 'W', createdAt: s, exercises: [{ name: 'Bench', sets: [{ reps: '10', weight: '60kg' }] }] })

    it('builds a full snapshot', async () => {
        const sessions = [iso('2026-08-10T09:00:00'), iso('2026-08-11T09:00:00')]
        const prs = [{ name: 'DL' }]
        const progress = computeProgress({ sessions, prs, frozenDays: [], now: new Date('2026-08-11T12:00:00') })
        expect(progress.workoutCount).toBe(2)
        expect(progress.totalSets).toBe(2)
        expect(progress.streak).toBe(2)
        expect(progress.exerciseRanks[0].name).toBe('Bench')
    })

    it('detects a level-up exactly once', async () => {
        expect(await getProgressionState()).toEqual({ lastLevel: 1 })
        await createSession({ name: 'Big', createdAt: new Date('2026-08-10T09:00:00').toISOString(), exercises: [] })
        const first = await refreshProgress(new Date('2026-08-10T12:00:00'))
        expect(first.isLevelUp).toBe(false) // no XP, still Rookie

        const big = await createSession({ name: 'Big', createdAt: new Date('2026-08-10T09:00:00').toISOString(), exercises: [{ name: 'Bench', sets: [{ reps: '10', weight: '60kg' }] }] })
        // simulate many sets to cross a threshold
        for (let i = 0; i < 4; i++) {
            await createSession({
                name: 'Big',
                createdAt: new Date('2026-08-10T10:00:00').toISOString(),
                exercises: Array.from({ length: 4 }, () => ({ name: `Ex${i}`, sets: [{ reps: '10', weight: '60kg' }] }))
            })
        }
        // XP alone must NOT rank up — every Rookie challenge must be cleared too
        const noChallenges = await refreshProgress(new Date('2026-08-10T12:00:00'))
        expect(noChallenges.progress.rank.level).toBe(1)

        // clear the remaining four groups (Chest done by Bench above)
        await createSession({
            name: 'Big',
            createdAt: new Date('2026-08-10T11:00:00').toISOString(),
            exercises: [
                { name: 'Deadlift', sets: [{ reps: '8', weight: '20kg' }] },
                { name: 'Curl', sets: [{ reps: '8', weight: '5kg' }] },
                { name: 'Squat', sets: [{ reps: '8', weight: '20kg' }] },
                { name: 'Sprint', mode: 'timer', sets: [{ reps: '2:30', weight: '—' }] }
            ]
        })
        const second = await refreshProgress(new Date('2026-08-10T12:00:00'))
        expect(second.progress.rank.level).toBeGreaterThan(1)
        expect(second.isLevelUp).toBe(true)

        const third = await refreshProgress(new Date('2026-08-10T12:00:00'))
        expect(third.isLevelUp).toBe(false)
        void big
    })
})

describe('rank challenges', () => {
    const timer = (name, duration) => ({ name, mode: 'timer', sets: [{ reps: duration, weight: '—' }] })
    const lift = (name, weight, reps = 8) => ({ name, sets: [{ reps: String(reps), weight: `${weight}kg` }] })

    it('defines five groups with ladders for every rank', () => {
        const level1 = challengesForLevel(1)
        expect(level1.map((g) => g.key)).toEqual(['chest', 'back', 'arms', 'legs', 'cardio'])
        expect(level1.find((g) => g.key === 'chest').targets[0]).toMatchObject({ kind: 'weight', value: 5 })
        expect(level1.find((g) => g.key === 'back').targets.map((t) => t.value)).toContain(20)
        expect(level1.find((g) => g.key === 'legs').targets.map((t) => t.value)).toContain(20)
        expect(level1.find((g) => g.key === 'cardio').targets[0]).toMatchObject({ kind: 'duration', value: 2 })
        expect(challengesForLevel(12)[0].targets[0].value).toBe(120)
    })

    it('matches exercise aliases', () => {
        const sessions = [{
            name: 'W', exercises: [
                lift('DB Bench Press', 20),
                lift('dl', 35),
                lift('lat pull down', 20),
                lift('Bicep Curl', 10),
                timer('jump rope', '4:00')
            ]
        }]
        const status = challengeStatusForLevel(sessions, 2)
        expect(status.find((g) => g.key === 'chest').done).toBe(true)
        expect(status.find((g) => g.key === 'back').done).toBe(true)
        expect(status.find((g) => g.key === 'arms').done).toBe(true)
        expect(status.find((g) => g.key === 'cardio').done).toBe(true)
    })

    it('clears a group with any alternative (Squat OR Leg Press)', () => {
        const bySquat = challengeStatusForLevel([{ name: 'W', exercises: [lift('Barbell Squat', 30)] }], 2)
        const byLegPress = challengeStatusForLevel([{ name: 'W', exercises: [lift('Leg Press', 60)] }], 2)
        expect(bySquat.find((g) => g.key === 'legs').done).toBe(true)
        expect(byLegPress.find((g) => g.key === 'legs').done).toBe(true)
    })

    it('clears back with Pull-Ups (bodyweight reps, no weight)', () => {
        const status = challengeStatusForLevel([{ name: 'W', exercises: [{ name: 'Pull Ups', sets: [{ reps: '8', weight: '—' }] }] }], 1, 0)
        expect(status.find((g) => g.key === 'back').done).toBe(true)
    })

    it('requires at least 8 reps on every lift to count', () => {
        const tooFew = challengeStatusForLevel([{ name: 'W', exercises: [lift('Bench', 20, 7)] }], 2)
        expect(tooFew.find((g) => g.key === 'chest').done).toBe(false)
        const enough = challengeStatusForLevel([{ name: 'W', exercises: [lift('Bench', 20, 8)] }], 2)
        expect(enough.find((g) => g.key === 'chest').done).toBe(true)
    })

    it('times cardio in minutes from timer sessions', () => {
        expect(challengeStatusForLevel([{ name: 'W', exercises: [timer('Skipping', '3:00')] }], 1, 0).find((g) => g.key === 'cardio').done).toBe(true)
        expect(challengeStatusForLevel([{ name: 'W', exercises: [timer('Sprint', '0:30')] }], 1, 0).find((g) => g.key === 'cardio').done).toBe(false)
    })

    it('cascades eligibility only when every prior rank is cleared', () => {
        const rookieSessions = [{
            name: 'W', exercises: [
                lift('Bench', 5),
                lift('Deadlift', 20),
                lift('Curl', 5),
                lift('Squat', 20),
                timer('Rope', '2:00')
            ]
        }]
        expect(challengeEligibleLevel(rookieSessions)).toBe(2)
        expect(challengeEligibleLevel([])).toBe(1)
    })

    it('gates the effective rank: XP alone cannot advance', () => {
        const onlyXp = { sessions: Array.from({ length: 20 }, (_, i) => ({ name: 'W', exercises: [lift(`Ex${i}`, 60)] })) }
        expect(computeProgress({ ...onlyXp, frozenDays: [], now: new Date('2026-08-10T12:00:00') }).rank.level).toBe(1)

        const allGroups = {
            sessions: Array.from({ length: 20 }, (_, i) => ({ name: 'W', exercises: [lift(`Ex${i}`, 60)] })).concat([{
                name: 'W', exercises: [
                    lift('Bench', 20),
                    lift('Deadlift', 35),
                    lift('Curl', 10),
                    lift('Squat', 30),
                    timer('Rope', '4:00')
                ]
            }])
        }
        const progress = computeProgress({ ...allGroups, frozenDays: [], now: new Date('2026-08-10T12:00:00') })
        expect(progress.rank.level).toBeGreaterThan(1)
        expect(progress.challenges.length).toBe(MAX_LEVEL)
        expect(progress.challenges[0].groups.every((g) => g.done)).toBe(true)
    })

    it('places experienced users at their granted rank with lower groups complete', () => {
        const progress = computeProgress({ sessions: [], frozenDays: [], now: new Date('2026-08-10T12:00:00'), startRank: 4 })
        expect(progress.rank.level).toBe(4)
        expect(progress.rank.name).toBe('Intermediate')
        expect(progress.xp).toBe(xpThresholdForLevel(4))
        expect(progress.challenges[0].groups.every((g) => g.done)).toBe(true)
        expect(progress.challenges[3].groups.every((g) => g.done)).toBe(true)
        expect(progress.challenges[4].groups.every((g) => g.done)).toBe(false)
    })

    it('start rank can still be gated by challenges above it', () => {
        const progress = computeProgress({
            sessions: [{ name: 'W', exercises: [lift('Ex0', 60)] }],
            frozenDays: [],
            now: new Date('2026-08-10T12:00:00'),
            startRank: 6
        })
        expect(progress.rank.level).toBe(6)
    })

    it('persists start rank and does not falsely celebrate on first open', async () => {
        expect(await getStartRank()).toBe(1)
        await saveStartRank(4)
        expect(await getStartRank()).toBe(4)
        await saveProgressionState({ lastLevel: 4 })
        const result = await refreshProgress(new Date('2026-08-10T12:00:00'))
        expect(result.progress.rank.level).toBe(4)
        expect(result.isLevelUp).toBe(false)
    })
})
