import { describe, it, expect, beforeEach } from 'vitest'
import {
    sessionXp,
    totalXp,
    analyzeSession,
    computePrsFromSessions,
    rankForXp,
    xpThresholdForLevel,
    MAX_LEVEL,
    colorForLevel,
    beginnerTarget,
    nextWeightTarget,
    nextTimeTarget,
    nextCountTarget,
    applySessionToLadders,
    seedLaddersFromHistory,
    ladderView,
    computeExerciseLadders,
    buildHistoryIndex,
    projectExerciseLadder,
    parseDurationSeconds,
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
    saveStartRank,
    getChallengePicks,
    saveChallengePicks,
    parseChallengeTime,
    formatChallengeTime,
    parseChallengeStep,
    formatChallengeStep,
    formatChallengeValue,
    DEFAULT_CHALLENGE_PICKS
} from '../progression'
import { createSession, saveUserProfile } from '../storage'
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

    it('gives no bonus on the first session for an exercise (no history to beat)', () => {
        expect(sessionXp(weightSession('Bench', 60, 10), [])).toBe(20)
        expect(sessionXp(timerSession('Plank', 60), [])).toBe(20)
    })

    it('gives +10 for a first-time weight (new PR)', () => {
        const prev = weightSession('Bench', 50, 10)
        expect(sessionXp(weightSession('Bench', 60, 10), [prev])).toBe(30)
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
        const prev = timerSession('Plank', 45)
        expect(sessionXp(timerSession('Plank', 60), [prev])).toBe(30)
        expect(sessionXp(timerSession('Plank', 60), [timerSession('Plank', 60)])).toBe(20)
        expect(sessionXp(timerSession('Plank', 90), [timerSession('Plank', 60)])).toBe(30)
    })

    it('parses stopwatch-style "M:SS" timer reps as seconds', () => {
        expect(parseDurationSeconds('1:30')).toBe(90)
        expect(parseDurationSeconds('0:45')).toBe(45)
        expect(parseDurationSeconds('120')).toBe(120)
        const stored = { id: 't1', name: 'W', exercises: [{ name: 'Plank', mode: 'timer', sets: [{ reps: '1:30', weight: '—' }] }] }
        const baseline = { id: 't0', name: 'W', exercises: [{ name: 'Plank', mode: 'timer', sets: [{ reps: '60' }] }] }
        expect(sessionXp(stored, [baseline])).toBe(30)
        const index = buildHistoryIndex([stored])
        expect(index.Plank.bestDuration).toBe(90)
    })

    it('does not award a timer record for an "M:SS" repeat of the same duration', () => {
        const a = { id: 't1', name: 'W', exercises: [{ name: 'Plank', mode: 'timer', sets: [{ reps: '1:30' }] }] }
        const b = { id: 't2', name: 'W', exercises: [{ name: 'Plank', mode: 'timer', sets: [{ reps: '1:30' }] }] }
        expect(sessionXp(b, [a])).toBe(20)
    })

    it('gives a per-exercise bonus for each exercise that sets a record', () => {
        const prev = {
            id: 'multi-prev',
            exercises: [
                { name: 'Bench', mode: 'weight', sets: [{ reps: '10', weight: '50kg' }] },
                { name: 'Squat', mode: 'weight', sets: [{ reps: '8', weight: '70kg' }] }
            ]
        }
        const session = {
            id: 'multi',
            exercises: [
                { name: 'Bench', mode: 'weight', sets: [{ reps: '10', weight: '60kg' }] },
                { name: 'Squat', mode: 'weight', sets: [{ reps: '8', weight: '80kg' }] }
            ]
        }
        expect(sessionXp(session, [prev])).toBe(20 + 10 + 10)
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
        expect(out.newPrs).toEqual([{ name: 'Bench', kind: 'weight', value: 65, reps: 10 }])
    })

    it('returns no PRs for extra-rep bonuses', () => {
        const prev = weightSession('Bench', 60, 8)
        const now = weightSession('Bench', 60, 10)
        const out = analyzeSession(now, [prev])
        expect(out.bonuses[0].type).toBe('extra-rep')
        expect(out.newPrs).toEqual([])
    })

    it('reports timer and counts records as PRs too', () => {
        const prev = timerSession('Plank', 60)
        const now = timerSession('Plank', 90)
        const out = analyzeSession(now, [prev])
        expect(out.newPrs).toEqual([{ name: 'Plank', kind: 'timer', value: 90 }])
        const priorCounts = { name: 'W', exercises: [{ name: 'Squat Jumps', mode: 'counts', sets: [{ reps: '20', weight: '—' }] }] }
        const counts = analyzeSession(
            { name: 'W', exercises: [{ name: 'Squat Jumps', mode: 'counts', sets: [{ reps: '25', weight: '—' }] }] },
            [priorCounts]
        )
        expect(counts.newPrs).toEqual([{ name: 'Squat Jumps', kind: 'counts', value: 25 }])
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
            { name: 'Bench', kind: 'weight', value: 65, reps: 8 },
            { name: 'Deadlift', kind: 'weight', value: 180, reps: 5 }
        ])
    })

    it('derives duration and counts PRs from timer and counts sessions', () => {
        const sessions = [
            { id: 'a', name: 'W', exercises: [{ name: 'Plank', mode: 'timer', sets: [{ reps: '1:30', weight: '—' }] }] },
            { id: 'b', name: 'W', exercises: [{ name: 'Squat Jumps', mode: 'counts', sets: [{ reps: '25', weight: '—' }] }] }
        ]
        expect(computePrsFromSessions(sessions)).toEqual([
            { name: 'Plank', kind: 'timer', value: 90 },
            { name: 'Squat Jumps', kind: 'counts', value: 25 }
        ])
    })

    it('returns nothing when the only session is removed', () => {
        const sessions = [weightSession('Bench', 65, 8, 'a')]
        const remaining = sessions.filter(s => s.id !== 'a')
        expect(computePrsFromSessions(remaining)).toEqual([])
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
        // First session: no bonus (no history). Repeat: same values, no bonus.
        expect(totalXp([s1, s2])).toBe(20 + 20)
    })

    it('credits every PR permanently, even after a heavier one lands', () => {
        const s1 = weightSession('Bench', 60, 10)
        const s2 = weightSession('Bench', 80, 5)
        // s1: no bonus (no history), s2: +10 PR (beat s1).
        expect(totalXp([s1, s2])).toBe(20 + 30)
    })

    it('rewards a progressive weight chain: each new weight is its own PR', () => {
        const s1 = weightSession('Bench', 60, 10)
        const s2 = weightSession('Bench', 65, 8)
        const s3 = weightSession('Bench', 70, 6)
        // s1: no bonus (no history), s2: +10 PR (beat s1), s3: +10 PR (beat s2).
        expect(totalXp([s1, s2, s3])).toBe(20 + 30 + 30)
    })
})

describe('exercise badge ladders', () => {
    const bench = (sets, category = 'Chest') => ({
        exercises: [{ name: 'Flat Bench Press', mode: 'weight', category, sets }]
    })

    it('seeds beginner targets from exercise presets (total weight)', () => {
        expect(beginnerTarget({ category: 'Chest', mode: 'weight', name: 'Flat Bench Press' })).toBe(10)
        expect(beginnerTarget({ category: 'Biceps', mode: 'weight', name: 'Barbell Curl' })).toBe(5)
        expect(beginnerTarget({ category: 'Biceps', mode: 'weight', name: 'Dumbbell Curl' })).toBe(10)
        expect(beginnerTarget({ category: 'Chest', mode: 'weight', name: 'Machine Chest Press' })).toBe(15)
        expect(beginnerTarget({ category: 'Shoulders', mode: 'weight', name: 'Lateral Raises' })).toBe(5)
        expect(beginnerTarget({ category: 'Core', mode: 'timer', name: 'Plank' })).toBe(25)
    })

    it('bodyweight exercises start at 12 reps (bodyweight-only)', () => {
        expect(beginnerTarget({ category: 'Chest', mode: 'bodyweight', name: 'Push-Up' })).toBe(12)
        expect(beginnerTarget({ category: 'Back', mode: 'bodyweight', name: 'Pull-Up' })).toBe(12)
        expect(beginnerTarget({ category: 'Chest', mode: 'bodyweight', name: 'Chest Dip' })).toBe(12)
        expect(beginnerTarget({ category: 'Core', mode: 'bodyweight', name: 'Bench Crunch' })).toBe(12)
        expect(beginnerTarget({ category: 'Core', mode: 'bodyweight', name: 'Hanging Leg Raise' })).toBe(12)
    })

    it('steps by exercise preset or ~8% rounded to plates, never under +step', () => {
        expect(nextWeightTarget(30)).toBe(32.5)
        expect(nextWeightTarget(32.5)).toBe(35)
        expect(nextWeightTarget(35)).toBe(37.5)
        expect(nextWeightTarget(120)).toBe(130)
        // Exercise-specific step sizes
        expect(nextWeightTarget(10, 'Lateral Raises')).toBe(12.5)
        expect(nextWeightTarget(50, 'Leg Press')).toBe(60)
        expect(nextWeightTarget(20, 'Flat Bench Press')).toBe(22.5)
    })

    it('mirrors the ladder in time for timer exercises (~10%, 5s steps)', () => {
        expect(nextTimeTarget(30)).toBe(35)
        expect(nextTimeTarget(90)).toBe(100)
    })

    it('gives each built-in cardio exercise its own time preset', () => {
        // Sprint is a short burst — starts tiny, climbs +5s
        expect(beginnerTarget({ category: 'Cardio', mode: 'timer', name: 'Sprint' })).toBe(20)
        expect(nextTimeTarget(20, 'Sprint')).toBe(25)
        // Skipping sits at 2:30 sets — climbs +30s
        expect(beginnerTarget({ category: 'Cardio', mode: 'timer', name: 'Skipping' })).toBe(150)
        expect(nextTimeTarget(150, 'Skipping')).toBe(180)
        // Jump rope runs long — 5 min start, climbs +1 min
        expect(beginnerTarget({ category: 'Cardio', mode: 'timer', name: 'Jump Rope' })).toBe(300)
        expect(nextTimeTarget(300, 'Jump Rope')).toBe(360)
        // Names without a preset keep the ~10% time ladder
        expect(beginnerTarget({ category: 'Core', mode: 'timer', name: 'Plank' })).toBe(25)
        expect(nextTimeTarget(25, 'Plank')).toBe(30)
    })

    it('uses a custom exercise challenge time as its level-1 badge target', () => {
        expect(beginnerTarget({ category: 'Cardio', mode: 'timer', name: 'Battle Ropes', challengeTime: 5 })).toBe(300)
        expect(beginnerTarget({ category: 'Cardio', mode: 'timer', name: 'Battle Ropes', challengeTime: 2.5 })).toBe(150)
    })

    it('uses a custom exercise start weight + increment for the weight ladder', () => {
        expect(beginnerTarget({ category: 'Chest', mode: 'weight', name: 'My Lift', startWeight: 20 })).toBe(20)
        expect(nextWeightTarget(20, 'My Lift', 5)).toBe(25)
        const proj = projectExerciseLadder(null, [], 'weight', 'Chest', 60, 'My Lift', null, null, 20, 5)
        expect(proj.entry.nextTarget).toBe(20)
        expect(proj.entry.startTarget).toBe(20)
        const done = projectExerciseLadder(null, [{ reps: '8', weight: '20' }], 'weight', 'Chest', 60, 'My Lift', null, null, 20, 5)
        expect(done.entry.successes).toBe(1)
        expect(done.entry.nextTarget).toBe(25)
    })

    it('uses custom start + increment for a counts exercise ladder', () => {
        const fresh = projectExerciseLadder(null, [], 'counts', 'Cardio', 60, 'My Counts', null, null, 12, 3)
        expect(fresh.entry.nextTarget).toBe(12)
        const done = projectExerciseLadder(null, [{ reps: '12' }], 'counts', 'Cardio', 60, 'My Counts', null, null, 12, 3)
        expect(done.entry.successes).toBe(1)
        expect(done.entry.nextTarget).toBe(15)
    })

    it('uses custom added load + increment for a bodyweight exercise ladder', () => {
        const fresh = projectExerciseLadder(null, [], 'bodyweight', 'Chest', 70, 'My Body', null, null, 0, 5)
        expect(fresh.entry.nextTarget).toBe(12)
        const done = projectExerciseLadder(null, [{ reps: '12', weight: '70' }], 'bodyweight', 'Chest', 70, 'My Body', null, null, 0, 5)
        expect(done.entry.successes).toBe(1)
        expect(done.entry.nextTarget).toBe(75)
    })

    it('case 1+6: first-session weight lands at the level the lift earns', () => {
        const { ladders, promotions } = applySessionToLadders({}, bench([{ reps: '8', weight: '18' }]), 60)
        const entry = ladders['Flat Bench Press']
        expect(promotions).toHaveLength(1)
        expect(promotions[0].name).toBe('Level 4')
        expect(entry.successes).toBe(4)
        expect(entry.lastSuccess).toBe(18)
        expect(entry.nextTarget).toBe(20)
        const view = ladderView(entry, 60)
        expect(view.levelName).toBe('Level 4')
        expect(view.strengthRatio).toBeCloseTo(0.3)
    })

    it('case 2: a higher first lift places the ladder higher', () => {
        const { ladders, promotions } = applySessionToLadders({}, bench([{ reps: '10', weight: '25' }]), 80)
        expect(ladders['Flat Bench Press'].startTarget).toBe(10)
        expect(promotions[0].name).toBe('Level 7')
        expect(ladders['Flat Bench Press'].nextTarget).toBe(27.5)
    })

    it('grants Level 1 to verified history that clears the starter target', () => {
        // 20kg @ 60kg sits below the relative-strength seed line, but it still
        // proves the starter challenge (17.5kg × 8) — no trained user stays Unranked.
        const seeded = seedLaddersFromHistory([bench([{ reps: '10', weight: '20' }])], 60, {})
        expect(seeded['Flat Bench Press'].successes).toBe(1)
        expect(ladderView(seeded['Flat Bench Press'], 60).levelName).toBe('Level 1')
        expect(seeded['Flat Bench Press'].nextTarget).toBe(22.5)
    })

    it('defaults to a 60kg reference when the profile has no bodyweight', () => {
        const seeded = seedLaddersFromHistory([bench([{ reps: '10', weight: '30' }])], 0, {})
        expect(seeded['Flat Bench Press'].successes).toBeGreaterThanOrEqual(1)
        expect(ladderView(seeded['Flat Bench Press'], 0).levelName).not.toBe('Unranked')
    })

    it('preserves bodyweight mode in ladder entries', () => {
        const session = {
            id: 's-bw1', name: 'Workout',
            exercises: [{ name: 'Pull-Up', mode: 'bodyweight', sets: [{ reps: '10', weight: '0kg' }] }]
        }
        const { ladders } = applySessionToLadders({}, session, 70)
        expect(ladders['Pull-Up']).toBeDefined()
        expect(ladders['Pull-Up'].mode).toBe('bodyweight')
    })

    it('scores bodyweight exercises on extra weight (weighted pull-ups)', () => {
        const session = {
            id: 's-bw2', name: 'Workout',
            exercises: [{ name: 'Pull-Up', mode: 'bodyweight', sets: [{ reps: '10', weight: '10kg' }] }]
        }
        const { ladders, promotions } = applySessionToLadders({}, session, 70)
        expect(ladders['Pull-Up'].mode).toBe('bodyweight')
        expect(ladders['Pull-Up'].personalBest).toBe(10)
        expect(promotions.length).toBeGreaterThanOrEqual(1)
    })

    it('repairs entries stranded at Unranked by the pre-fix placement', () => {
        const stranded = {
            'Flat Bench Press': {
                mode: 'weight', category: 'Chest', startTarget: 17.5, lastSuccess: 20,
                personalBest: 20, nextTarget: 22.5, successes: 0, highestLevel: 0,
                bodyweightAtTime: 60, updatedAt: '2026-01-01T00:00:00Z'
            }
        }
        const repaired = seedLaddersFromHistory([bench([{ reps: '10', weight: '20' }])], 60, stranded)
        expect(repaired['Flat Bench Press'].successes).toBe(1)
        // Earned progress is never touched
        const earned = { ...stranded['Flat Bench Press'], successes: 3 }
        const untouched = seedLaddersFromHistory([bench([{ reps: '10', weight: '20' }])], 60, {
            'Flat Bench Press': earned
        })
        expect(untouched).toBeNull()
    })

    it('end-to-end: history saved through storage ranks on the next launch', async () => {
        await saveUserProfile({ weight: '60' })
        await createSession({
            name: 'W',
            createdAt: new Date('2026-08-10T09:00:00').toISOString(),
            exercises: [{ name: 'Flat Bench Press', mode: 'weight', category: 'Chest', sets: [{ reps: '10', weight: '40kg' }] }]
        })
        const result = await refreshProgress()
        const bench = result.progress.exerciseRanks.find(r => r.name === 'Flat Bench Press')
        expect(bench.levelName).toBe('Level 1')
    })

    it('case 3: a 60kg user already benching 80kg starts at Level 1 from history', () => {
        const seeded = seedLaddersFromHistory([bench([{ reps: '10', weight: '80' }])], 60, {})
        const entry = seeded['Flat Bench Press']
        expect(entry.successes).toBe(1)
        expect(entry.lastSuccess).toBe(80)
        expect(entry.nextTarget).toBe(nextWeightTarget(80))
        expect(ladderView(entry, 60).levelName).toBe('Level 1')
    })

    it('case 4: a 60kg user benching 120kg starts at Level 1 from history', () => {
        const seeded = seedLaddersFromHistory([bench([{ reps: '8', weight: '120' }])], 60, {})
        const entry = seeded['Flat Bench Press']
        expect(entry.successes).toBe(1)
        expect(ladderView(entry, 60).levelName).toBe('Level 1')
        expect(entry.nextTarget).toBe(nextWeightTarget(120))
    })

    it('case 5: failing the 5-rep requirement keeps level and target untouched', () => {
        const first = applySessionToLadders({}, bench([{ reps: '5', weight: '18' }]), 60)
        const before = first.ladders['Flat Bench Press']
        const second = applySessionToLadders(first.ladders, bench([{ reps: '3', weight: '40' }]), 60)
        const after = second.ladders['Flat Bench Press']
        expect(second.promotions).toHaveLength(0)
        expect(after.successes).toBe(before.successes)
        expect(after.nextTarget).toBe(before.nextTarget)
        expect(after.lastSuccess).toBe(before.lastSuccess)
    })

    it('case 7: users keep progressing past level 1', () => {
        const seeded = seedLaddersFromHistory([bench([{ reps: '8', weight: '150' }])], 60, {})
        expect(seeded['Flat Bench Press'].successes).toBe(1)
        const nextT = nextWeightTarget(150)
        // Below next target — no advance
        const mid = applySessionToLadders(seeded, bench([{ reps: '5', weight: String(nextT - 1) }]), 60)
        expect(mid.ladders['Flat Bench Press'].successes).toBe(1)
        // Above next target — advance
        const { ladders, promotions } = applySessionToLadders(seeded, bench([{ reps: '5', weight: String(nextT) }]), 60)
        const entry = ladders['Flat Bench Press']
        expect(promotions).toHaveLength(1)
        expect(entry.successes).toBe(2)
        expect(entry.lastSuccess).toBe(nextT)
    })

    it('case 8: changing bodyweight updates the ratio but never resets earned progress', () => {
        const seeded = seedLaddersFromHistory([bench([{ reps: '10', weight: '80' }])], 60, {})
        const entry = seeded['Flat Bench Press']
        const lighter = ladderView(entry, 55)
        const heavier = ladderView(entry, 70)
        expect(lighter.successes).toBe(heavier.successes)
        expect(lighter.nextTarget).toBe(heavier.nextTarget)
        expect(lighter.strengthRatio).toBeGreaterThan(heavier.strengthRatio)
        expect(heavier.strengthRatio).toBeCloseTo(80 / 70, 2)
    })

    it('case 9: each exercise keeps its own ladder with its own factors', () => {
        const session = {
            exercises: [
                { name: 'Flat Bench Press', mode: 'weight', category: 'Chest', sets: [{ reps: '8', weight: '18' }] },
                { name: 'Barbell Curl', mode: 'weight', sets: [{ reps: '8', weight: '8' }] },
                { name: 'Plank', mode: 'timer', category: 'Core', sets: [{ reps: '0:30' }] }
            ]
        }
        const { ladders } = applySessionToLadders({}, session, 60)
        expect(ladders['Flat Bench Press'].successes).toBe(4)
        expect(ladders['Barbell Curl'].category).toBe('Biceps')
        expect(ladders['Barbell Curl'].successes).toBe(2)
        expect(ladders['Plank'].successes).toBe(2)
        expect(ladders['Plank'].nextTarget).toBe(35)
        expect(ladders['Flat Bench Press'].nextTarget).not.toBe(ladders['Barbell Curl'].nextTarget)
    })

    it('parses "M:SS" timer holds when completing challenges', () => {
        const { ladders } = applySessionToLadders({}, {
            exercises: [{ name: 'Plank', mode: 'timer', category: 'Core', sets: [{ reps: '1:30' }] }]
        }, 60)
        expect(ladders.Plank.personalBest).toBe(90)
        expect(ladders.Plank.successes).toBe(12)
        expect(ladders.Plank.nextTarget).toBe(95)
    })

    it('anchors a custom cardio ladder at its challenge time (minutes)', () => {
        const { ladders } = applySessionToLadders({}, {
            exercises: [{ name: 'Battle Ropes', mode: 'timer', category: 'Cardio', challengeTime: 5, sets: [{ reps: '5:00' }] }]
        }, 60)
        expect(ladders['Battle Ropes'].startTarget).toBe(300)
        expect(ladders['Battle Ropes'].successes).toBe(1)
        expect(ladders['Battle Ropes'].nextTarget).toBe(330)
        const live = projectExerciseLadder(null, [{ reps: '6:00', weight: '—' }], 'timer', 'Cardio', 60, 'Battle Ropes', 5)
        expect(live.entry.successes).toBe(2)
        expect(live.entry.nextTarget).toBe(365)
        expect(live.didLevelUp).toBe(true)
    })

    it('orders the badge list alphabetically', () => {
        const seeded = seedLaddersFromHistory([
            bench([{ reps: '10', weight: '80' }]),
            { exercises: [{ name: 'Barbell Curl', mode: 'weight', category: 'Biceps', sets: [{ reps: '12', weight: '15' }] }] }
        ], 60, {})
        const ranks = computeExerciseLadders(seeded, 60)
        expect(ranks[0].name).toBe('Barbell Curl')
        expect(ranks[1].name).toBe('Flat Bench Press')
        expect(colorForLevel(1)).toBe('#34d399')
        expect(colorForLevel(6)).toBe('#facc15')
        expect(colorForLevel(11)).toBe('#f43f5e')
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
        const ladders = seedLaddersFromHistory(sessions, 70, {})
        const progress = computeProgress({ sessions, frozenDays: [], now: new Date('2026-08-11T12:00:00'), ladders })
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

        const big = await createSession({ name: 'Big', createdAt: new Date('2026-08-10T09:00:00').toISOString(), exercises: [{ name: 'Flat Bench Press', sets: [{ reps: '10', weight: '60kg' }] }] })
        // simulate many sets to cross a threshold
        for (let i = 0; i < 4; i++) {
            await createSession({
                name: 'Big',
                createdAt: new Date('2026-08-10T10:00:00').toISOString(),
                exercises: Array.from({ length: 4 }, () => ({ name: `Ex${i}`, sets: [{ reps: '10', weight: '60kg' }] }))
            })
        }
        // XP alone must NOT rank up — every scheduled challenge must be cleared too
        const noChallenges = await refreshProgress(new Date('2026-08-10T12:00:00'))
        expect(noChallenges.progress.rank.level).toBe(1)

        // clear the remaining challenges (Flat Bench Press done above)
        await createSession({
            name: 'Big',
            createdAt: new Date('2026-08-10T11:00:00').toISOString(),
            exercises: [
                { name: 'Deadlift', sets: [{ reps: '8', weight: '20kg' }] },
                { name: 'Barbell Curl', sets: [{ reps: '8', weight: '5kg' }] },
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

describe('counts mode', () => {
    const countsSession = (name, counts, id) => ({
        id: id || `c-${++idCounter}`,
        name: 'Workout',
        exercises: [{ name, mode: 'counts', category: 'Legs', sets: counts.map((c) => ({ reps: String(c), weight: '—' })) }]
    })

    it('starts counts exercises at 12 with a flat +3 step (10% past 50)', () => {
        expect(beginnerTarget({ category: 'Legs', mode: 'counts', name: 'Squat Jumps' })).toBe(12)
        // 12 → 15 → 18 → 21 … exactly +3 per level up to 50
        expect(nextCountTarget(12)).toBe(15)
        expect(nextCountTarget(15)).toBe(18)
        expect(nextCountTarget(49)).toBe(52)
        expect(nextCountTarget(50)).toBe(53)
        // past 50 counts the step becomes ~10% so big counts stay meaningful
        expect(nextCountTarget(51)).toBe(56)
        expect(nextCountTarget(75)).toBe(82)
    })

    it('awards +10 XP when a set beats the best count record', () => {
        const prev = countsSession('Squat Jumps', [20])
        const now = countsSession('Squat Jumps', [25, 25])
        expect(sessionXp(now, [prev])).toBe(30)
        expect(sessionXp(countsSession('Squat Jumps', [20]), [])).toBe(20)
    })

    it('tracks bestCount in the history index', () => {
        const index = buildHistoryIndex([{ id: 'c1', name: 'W', exercises: [{ name: 'Squat Jumps', mode: 'counts', sets: [{ reps: '10', weight: '—' }, { reps: '30', weight: '—' }] }] }])
        expect(index['Squat Jumps'].bestCount).toBe(30)
        expect(index['Squat Jumps'].bestWeight).toBe(-Infinity)
    })

    it('places the counts ladder from a first session and promotes past it', () => {
        const first = applySessionToLadders({}, { id: 'c1', name: 'W', exercises: [{ name: 'Squat Jumps', mode: 'counts', category: 'Legs', sets: [{ reps: '12', weight: '—' }] }] }, 60)
        const entry = first.ladders['Squat Jumps']
        expect(entry.mode).toBe('counts')
        expect(entry.successes).toBe(1)
        const nextT = entry.nextTarget
        const second = applySessionToLadders(first.ladders, { id: 'c2', name: 'W', exercises: [{ name: 'Squat Jumps', mode: 'counts', category: 'Legs', sets: [{ reps: String(nextT), weight: '—' }] }] }, 60)
        expect(second.promotions).toHaveLength(1)
        expect(second.ladders['Squat Jumps'].successes).toBe(2)
        expect(second.ladders['Squat Jumps'].lastSuccess).toBe(nextT)
    })

    it('seeds existing counts history at Level 1', () => {
        const seeded = seedLaddersFromHistory([{ id: 'c1', name: 'W', exercises: [{ name: 'Squat Jumps', mode: 'counts', sets: [{ reps: '30', weight: '—' }] }] }], 60, {})
        const entry = seeded['Squat Jumps']
        expect(entry.mode).toBe('counts')
        expect(entry.successes).toBe(1)
        expect(entry.nextTarget).toBe(nextCountTarget(30))
    })

    it('projects a live counts level from in-progress sets', () => {
        const proj = projectExerciseLadder(null, [{ reps: '12', weight: '—' }], 'counts', 'Legs', 60, 'Squat Jumps')
        expect(proj.entry.successes).toBe(1)
        expect(proj.entry.nextTarget).toBe(nextCountTarget(12))
        expect(proj.didLevelUp).toBe(true)
    })

    it('resolves a picked counts exercise to the counts challenge ladder', () => {
        const custom = [{ name: 'Squat Jumps', mode: 'counts', category: 'Legs' }]
        const ch = challengesForLevel({ legs: 'Squat Jumps' }, custom, 1).find((c) => c.key === 'legs')
        expect(ch.kind).toBe('counts')
        expect(ch.value).toBe(12)
        const status = challengeStatusForLevel(
            [{ id: 'c1', name: 'W', exercises: [{ name: 'Squat Jumps', mode: 'counts', category: 'Legs', sets: [{ reps: '20', weight: '—' }] }] }],
            1,
            { legs: 'Squat Jumps' },
            custom
        )
        expect(status.find((c) => c.key === 'legs').done).toBe(true)
    })
})

describe('rank challenges', () => {
    const session = (exercises) => ({ name: 'W', exercises })
    const lift = (name, weight, reps = 8) => ({ name, sets: [{ reps: String(reps), weight: `${weight}kg` }] })
    const timer = (name, duration) => ({ name, mode: 'timer', sets: [{ reps: duration, weight: '—' }] })
    const reps = (name, count) => ({ name, sets: [{ reps: String(count), weight: '—' }] })
    const DEFAULTS = {
        chest: 'Flat Bench Press',
        back: 'Deadlift',
        arms: 'Barbell Curl',
        legs: 'Squat',
        cardio: 'Sprint'
    }

    it('builds one challenge per muscle group with sensible defaults', () => {
        const level1 = challengesForLevel({}, [], 1)
        expect(level1).toHaveLength(5)
        expect(level1.map((c) => c.key)).toEqual(['chest', 'back', 'arms', 'legs', 'cardio'])
        expect(level1.map((c) => c.label)).toEqual(['Flat Bench Press', 'Deadlift', 'Barbell Curl', 'Squat', 'Sprint'])
        expect(level1[0]).toMatchObject({ kind: 'weight', value: 10 })  // bench ladder
        expect(level1[1]).toMatchObject({ kind: 'weight', value: 20 })  // deadlift ladder
        expect(level1[2]).toMatchObject({ kind: 'weight', value: 5 })   // curl ladder
        expect(level1[3]).toMatchObject({ kind: 'weight', value: 20 })  // squat ladder
        expect(level1[4]).toMatchObject({ kind: 'duration', value: 20 / 60 }) // cardio anchor = Sprint's 20s preset
        expect(challengesForLevel({}, [], 12)[0].value).toBe(120)
        // deadlift tail grows by 20kg per rank after 110
        expect(challengesForLevel({}, [], 8)[1].value).toBe(130)
        expect(challengesForLevel({}, [], 12)[1].value).toBe(210)
    })

    it('scores a leg press pick on its own heavier ladder', () => {
        const legs = challengesForLevel({ legs: 'Leg Press' }, [], 1).find((c) => c.key === 'legs')
        expect(legs).toMatchObject({ kind: 'weight', value: 60 })
        const squat = challengesForLevel({}, [], 1).find((c) => c.key === 'legs')
        expect(squat.value).toBe(20)
    })

    it('uses the picked exercise as the challenge label', () => {
        const level1 = challengesForLevel({ chest: 'Incline Bench Press' }, [], 1)
        expect(level1[0].label).toBe('Incline Bench Press')
        expect(challengesForLevel({ back: 'Pull-Up' }, [], 1)[1].label).toBe('Pull-Up')
        expect(level1.map((c) => c.key)).toEqual(['chest', 'back', 'arms', 'legs', 'cardio'])
    })

    it('clears a challenge by logging the picked exercise at 8+ reps', () => {
        const status = challengeStatusForLevel([session([lift('Flat Bench Press', 10)])], 1, DEFAULTS, [])
        expect(status.find((c) => c.key === 'chest').done).toBe(true)
        expect(status.find((c) => c.key === 'cardio').done).toBe(false)
    })

    it('requires at least 5 reps on every lift to count', () => {
        const tooFew = challengeStatusForLevel([session([lift('Flat Bench Press', 20, 4)])], 2, DEFAULTS, [])
        expect(tooFew[0].done).toBe(false)
        const enough = challengeStatusForLevel([session([lift('Flat Bench Press', 20, 5)])], 2, DEFAULTS, [])
        expect(enough[0].done).toBe(true)
    })

    it('only the picked exercise clears its own group', () => {
        const status = challengeStatusForLevel([session([lift('Squat', 60)])], 2, DEFAULTS, [])
        expect(status[0].done).toBe(false)
        expect(status.find((c) => c.key === 'legs').done).toBe(true)
    })

    it('scores bodyweight picks on reps', () => {
        const status = challengeStatusForLevel([session([reps('Push-Up', 8)])], 1, { chest: 'Push-Up' }, [])
        expect(status[0]).toMatchObject({ kind: 'reps', value: 8, done: true })
    })

    it('scores cardio picks on duration', () => {
        // Default cardio pick (Sprint) challenge ladder anchors on its 20s preset
        expect(challengeStatusForLevel([session([timer('Sprint', '0:30')])], 1, DEFAULTS, []).find((c) => c.key === 'cardio').done).toBe(true)
        expect(challengeStatusForLevel([session([timer('Sprint', '0:10')])], 1, DEFAULTS, []).find((c) => c.key === 'cardio').done).toBe(false)
    })

    it('cascades eligibility only when all 5 challenges are cleared', () => {
        const allCleared = [lift('Flat Bench Press', 10), lift('Deadlift', 20), lift('Barbell Curl', 5), lift('Squat', 20), timer('Sprint', '2:00')]
        expect(challengeEligibleLevel([session(allCleared)], {}, [])).toBe(2)
        expect(challengeEligibleLevel([session([lift('Flat Bench Press', 5)])], {}, [])).toBe(1)
        expect(challengeEligibleLevel([], {}, [])).toBe(1)
    })

    it('lets the user opt out of the cardio challenge', () => {
        const picks = { ...DEFAULTS, cardio: null }
        expect(challengesForLevel(picks, [], 1).map((c) => c.key)).toEqual(['chest', 'back', 'arms', 'legs'])
        const allCleared = [lift('Flat Bench Press', 10), lift('Deadlift', 20), lift('Barbell Curl', 5), lift('Squat', 20)]
        expect(challengeEligibleLevel([session(allCleared)], picks, [])).toBe(2)
    })

    it('parses free-text challenge times into minutes', () => {
        expect(parseChallengeTime('2:30')).toBe(2.5)
        expect(parseChallengeTime('90s')).toBe(1.5)
        expect(parseChallengeTime('90 sec')).toBe(1.5)
        expect(parseChallengeTime('5m')).toBe(5)
        expect(parseChallengeTime('12 min')).toBe(12)
        expect(parseChallengeTime('45')).toBe(0.75)
        expect(parseChallengeTime('abc')).toBe(null)
        expect(parseChallengeTime('')).toBe(null)
        expect(formatChallengeTime(5)).toBe('5m')
        expect(formatChallengeTime(2.5)).toBe('2:30')
        expect(formatChallengeTime(0)).toBe('')
    })

    it('scales the cardio ladder from a custom challenge time', () => {
        const custom = [{ name: 'Battle Ropes', mode: 'timer', challengeTime: 5 }]
        const at = (level) => challengesForLevel({ cardio: 'Battle Ropes' }, custom, level).find((c) => c.key === 'cardio')
        // Without an increment a custom timer exercise only clears Rookie —
        // higher ranks are unreachable.
        expect(at(1).value).toBe(5)
        expect(at(2).value).toBe(Infinity)
        expect(at(12).value).toBe(Infinity)
        // the default cardio pick (Sprint) anchors on its 20s time preset
        expect(challengesForLevel({}, [], 1).find((c) => c.key === 'cardio').value).toBeCloseTo(20 / 60, 6)
    })

    it('builds an accelerating challenge ladder steeper than the badge ladder', () => {
        const custom = [{ name: 'Battle Ropes', mode: 'timer', challengeTime: 5, challengeStep: 10 }]
        const at = (level) => challengesForLevel({ cardio: 'Battle Ropes' }, custom, level).find((c) => c.key === 'cardio')
        // The badge ladder climbs +10s flat (5:00 → 5:10 → 5:20); the challenge
        // pulls ahead with 1×, 2×, 3× of the increment: 5:00, 5:10, 5:30, 6:00…
        expect(at(1).value).toBe(5)
        expect(at(2).value).toBeCloseTo(5 + 10 / 60, 6)
        expect(at(3).value).toBeCloseTo(5 + 30 / 60, 6)
        expect(at(4).value).toBeCloseTo(5 + 60 / 60, 6)
        expect(at(12).value).toBeCloseTo(5 + 66 * 10 / 60, 6)
        // a 1-minute step lands on clean minutes and built-in presets accelerate too
        const big = [{ name: 'Row Machine', mode: 'timer', challengeTime: 5, challengeStep: 60 }]
        expect(challengesForLevel({ cardio: 'Row Machine' }, big, 3).find((c) => c.key === 'cardio').value).toBe(8)
        expect(challengesForLevel({}, [], 3).find((c) => c.key === 'cardio').value).toBeCloseTo((20 + 5 * 3) / 60, 6)
    })

    it('lets a step-equipped challenge clear its rank, and caps the rankless one', () => {
        const stepped = [{ name: 'Battle Ropes', mode: 'timer', challengeTime: 5, challengeStep: 10 }]
        const ok = challengeStatusForLevel([session([timer('Battle Ropes', '5:10')])], 2, { cardio: 'Battle Ropes' }, stepped)
        expect(ok.find((c) => c.key === 'cardio').done).toBe(true)
        const blocked = [{ name: 'Battle Ropes', mode: 'timer', challengeTime: 5 }]
        const capped = challengeStatusForLevel([session([timer('Battle Ropes', '60:00')])], 2, { cardio: 'Battle Ropes' }, blocked)
        expect(capped.find((c) => c.key === 'cardio').done).toBe(false)
    })

    it('parses per-level increments and formats challenge values', () => {
        expect(parseChallengeStep('10s')).toBe(10)
        expect(parseChallengeStep('30')).toBe(30)
        expect(parseChallengeStep('1m')).toBe(60)
        expect(parseChallengeStep('1:30')).toBe(90)
        expect(parseChallengeStep('abc')).toBe(null)
        expect(formatChallengeStep(10)).toBe('10s')
        expect(formatChallengeStep(60)).toBe('1m')
        expect(formatChallengeStep(null)).toBe('')
        expect(formatChallengeValue(5)).toBe('5m')
        expect(formatChallengeValue(5 + 10 / 60)).toBe('5:10')
        expect(formatChallengeValue(2.5)).toBe('2:30')
        expect(formatChallengeValue(Infinity)).toBe('∞')
    })

    it('clears a custom-time cardio challenge at its own pace', () => {
        const custom = [{ name: 'Battle Ropes', mode: 'timer', challengeTime: 5 }]
        const done = challengeStatusForLevel([session([timer('Battle Ropes', '5:00')])], 1, { cardio: 'Battle Ropes' }, custom)
        expect(done.find((c) => c.key === 'cardio').done).toBe(true)
        const short = challengeStatusForLevel([session([timer('Battle Ropes', '4:00')])], 1, { cardio: 'Battle Ropes' }, custom)
        expect(short.find((c) => c.key === 'cardio').done).toBe(false)
    })

    it('missing picks fall back to defaults and picks persist', async () => {
        expect(await getChallengePicks()).toEqual(DEFAULT_CHALLENGE_PICKS)
        await saveChallengePicks({ chest: 'Incline Bench Press' })
        const picks = await getChallengePicks()
        expect(picks.chest).toBe('Incline Bench Press')
        expect(picks.back).toBe('Deadlift')
        expect(challengesForLevel(picks, [], 1)[0].label).toBe('Incline Bench Press')
    })

    it('gates the effective rank: XP alone cannot advance', () => {
        const onlyXp = { sessions: Array.from({ length: 20 }, (_, i) => ({ name: 'W', exercises: [lift(`Ex${i}`, 60)] })) }
        expect(computeProgress({ ...onlyXp, frozenDays: [], now: new Date('2026-08-10T12:00:00') }).rank.level).toBe(1)

        const allCleared = {
            sessions: Array.from({ length: 20 }, (_, i) => ({ name: 'W', exercises: [lift(`Ex${i}`, 60)] })).concat([{
                name: 'W', exercises: [lift('Flat Bench Press', 20), lift('Deadlift', 35), lift('Barbell Curl', 10), lift('Squat', 30), timer('Sprint', '4:00')]
            }])
        }
        const progress = computeProgress({ ...allCleared, frozenDays: [], now: new Date('2026-08-10T12:00:00') })
        expect(progress.rank.level).toBeGreaterThan(1)
        expect(progress.challenges.length).toBe(MAX_LEVEL)
        expect(progress.challenges[0].groups.every((g) => g.done)).toBe(true)
    })

    it('places experienced users at their granted rank with lower challenges complete', () => {
        const progress = computeProgress({ sessions: [], frozenDays: [], now: new Date('2026-08-10T12:00:00'), startRank: 4 })
        expect(progress.rank.level).toBe(4)
        expect(progress.rank.name).toBe('Intermediate')
        // The start rank seeds its threshold XP as a bank.
        expect(progress.xp).toBe(xpThresholdForLevel(4))
        // Ranks strictly below the start rank are granted...
        expect(progress.challenges[0].groups.every((g) => g.done)).toBe(true)
        expect(progress.challenges[2].groups.every((g) => g.done)).toBe(true)
        // ...but the start rank itself is a real checklist, never pre-filled.
        expect(progress.challenges[3].groups.every((g) => g.done)).toBe(false)
        expect(progress.challenges[4].groups.every((g) => g.done)).toBe(false)
    })

    it('adds every saved session XP on top of the seeded start-rank bank', () => {
        const one = computeProgress({
            sessions: [{ id: 'a', name: 'W', createdAt: '2026-08-10T09:00:00', exercises: [lift('Flat Bench Press', 20)] }],
            frozenDays: [],
            now: new Date('2026-08-10T12:00:00'),
            startRank: 4
        })
        expect(one.xp).toBe(xpThresholdForLevel(4) + 20)
        expect(one.rank.xp).toBe(xpThresholdForLevel(4) + 20)
        const two = computeProgress({
            sessions: [{ id: 'a', name: 'W', createdAt: '2026-08-10T09:00:00', exercises: [lift('Flat Bench Press', 20)] }, { id: 'b', name: 'W', createdAt: '2026-08-11T09:00:00', exercises: [lift('Deadlift', 35)] }],
            frozenDays: [],
            now: new Date('2026-08-11T12:00:00'),
            startRank: 4
        })
        expect(two.xp).toBe(xpThresholdForLevel(4) + 40)
        expect(two.rank.xp).toBe(xpThresholdForLevel(4) + 40)
    })

    it('does not pre-fill the Rookie checklist for a fresh beginner', () => {
        const progress = computeProgress({ sessions: [], frozenDays: [], now: new Date('2026-08-10T12:00:00'), startRank: 1 })
        expect(progress.rank.level).toBe(1)
        expect(progress.rank.name).toBe('Rookie')
        expect(progress.challenges[0].groups.every((g) => g.done)).toBe(false)
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
