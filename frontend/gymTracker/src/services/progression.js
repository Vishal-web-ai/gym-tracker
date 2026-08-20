import { dbGet, dbPut } from './idb'
import { getSessions, toDayKey, getUserProfile, getCustomExercises } from './storage'
import { exerciseMetaByName, inferCategoryByName } from './exercises'

// ---------------------------------------------------------------------------
// Ranks (player level ladder, driven by total XP)
// ---------------------------------------------------------------------------

export const RANKS = [
    { name: 'Rookie', color: '#9ca3af', icon: '/badge/rookie.png' },
    { name: 'Beginner', color: '#a3e635', icon: '/badge/begineer.png' },
    { name: 'Learner', color: '#38bdf8', icon: '/badge/learner.png' },
    { name: 'Intermediate', color: '#34d399' },
    { name: 'Skilled', color: '#fbbf24' },
    { name: 'Strong', color: '#fb923c' },
    { name: 'Pro', color: '#f97316' },
    { name: 'Elite', color: '#f43f5e' },
    { name: 'Master', color: '#a855f7' },
    { name: 'Grandmaster', color: '#e879f9' },
    { name: 'Champion', color: '#facc15' },
    { name: 'Legend', color: '#fde047' }
]

export const MAX_LEVEL = RANKS.length

// XP needed to reach a given level. Level 1 starts at 0.
export function xpThresholdForLevel(level) {
    return 50 * level * (level - 1)
}

export const BASE_SESSION_XP = 20
export const EXTRA_REP_XP = 5
export const PR_XP = 10

// A set is "logged" when it carries a rep value or a weight value.
export function loggedSetsOf(exercise) {
    if (!Array.isArray(exercise?.sets)) return 0
    return exercise.sets.filter((s) => {
        if (!s) return false
        const hasReps = s.reps !== undefined && s.reps !== null && s.reps !== '' && s.reps !== '—'
        const hasWeight = s.weight !== undefined && s.weight !== null && s.weight !== '' && s.weight !== '—'
        return hasReps || hasWeight
    }).length
}

export function parseWeight(v) {
    if (v == null) return null
    if (typeof v === 'number') return v
    const s = String(v).trim().replace(',', '.')
    if (!s || s === '—') return null
    const n = parseFloat(s)
    return Number.isFinite(n) ? n : null
}

export function parseReps(v) {
    if (v == null) return 0
    if (typeof v === 'number') return v
    const s = String(v).trim()
    if (!s || s === '—') return 0
    const n = parseFloat(s)
    return Number.isFinite(n) ? n : 0
}

// Timer durations are stored as "M:SS" (e.g. "1:30") by the stopwatch, while
// older data and tests may use bare seconds. Always resolve to seconds.
export function parseDurationSeconds(v) {
    if (v == null) return 0
    if (typeof v === 'number') return v
    const s = String(v).trim()
    if (!s || s === '—') return 0
    if (s.includes(':')) {
        const [m, sec] = s.split(':')
        return (parseFloat(m) || 0) * 60 + (parseFloat(sec) || 0)
    }
    const n = parseFloat(s)
    return Number.isFinite(n) ? n : 0
}

// Formats a duration in seconds back to the app's "M:SS" display style.
export function formatDuration(seconds) {
    if (!(seconds > 0)) return '—'
    const m = Math.floor(seconds / 60)
    const s = Math.round(seconds % 60)
    return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`
}

// All-time bests per exercise from a set of sessions: heaviest weight, best
// reps at each weight, and best duration for timer exercises.
export function buildHistoryIndex(sessions) {
    const index = {}
    for (const s of sessions) {
        for (const ex of (s?.exercises || [])) {
            const entry = index[ex.name] || (index[ex.name] = { bestWeight: -Infinity, bestRepsAtWeight: {}, bestDuration: 0 })
            if (ex.mode === 'timer') {
                for (const set of (ex?.sets || [])) {
                    const r = parseDurationSeconds(set?.reps)
                    if (r > entry.bestDuration) entry.bestDuration = r
                }
            } else {
                for (const set of (ex?.sets || [])) {
                    const w = parseWeight(set?.weight)
                    const r = parseReps(set?.reps)
                    if (w != null) {
                        if (w > entry.bestWeight) entry.bestWeight = w
                        if (r > 0 && (entry.bestRepsAtWeight[w] || 0) < r) entry.bestRepsAtWeight[w] = r
                    }
                }
            }
        }
    }
    return index
}

// Per-exercise bonus against a history index. Returns null, or a bonus object.
// A weight PR (+10) beats an extra-rep bonus (+5); they never stack.
function exerciseBonus(ex, index) {
    const sets = (ex?.sets || []).filter((s) => {
        const v = s?.reps
        return v != null && String(v).trim() !== '' && String(v).trim() !== '—'
    })
    if (!sets.length) return null
    const entry = index[ex.name]

    if (ex.mode === 'timer') {
        const best = Math.max(...sets.map((s) => parseDurationSeconds(s.reps)))
        if (!entry || best > entry.bestDuration) {
            return { type: 'timer-record', points: PR_XP, name: ex.name, value: best }
        }
        return null
    }

    const weighted = sets.filter((s) => parseWeight(s?.weight) != null)
    if (!weighted.length) return null
    const thisBestWeight = Math.max(...weighted.map((s) => parseWeight(s.weight)))
    const prevBestWeight = entry?.bestWeight ?? -Infinity

    if (thisBestWeight > prevBestWeight) {
        const prSets = weighted.filter((s) => parseWeight(s.weight) === thisBestWeight)
        const reps = Math.max(...prSets.map((s) => parseReps(s.reps)))
        return { type: 'weight-pr', points: PR_XP, name: ex.name, value: thisBestWeight, reps }
    }

    for (const s of weighted) {
        const w = parseWeight(s.weight)
        const r = parseReps(s.reps)
        if (r > (entry?.bestRepsAtWeight?.[w] || 0)) {
            return { type: 'extra-rep', points: EXTRA_REP_XP, name: ex.name, value: r, weight: w }
        }
    }
    return null
}

// XP for one saved session: a flat base plus per-exercise bonuses. `history`
// is every OTHER session (used to detect records). An empty history means
// everything counts as a first-time record.
export function sessionXp(session, history = []) {
    return analyzeSession(session, history).xp
}

// Full breakdown of a session's rewards, including the PRs it should add to
// the manual PR list.
export function analyzeSession(session, history = []) {
    const index = buildHistoryIndex(history)
    const bonuses = []
    for (const ex of (session?.exercises || [])) {
        const b = exerciseBonus(ex, index)
        if (b) bonuses.push(b)
    }
    return {
        base: BASE_SESSION_XP,
        bonuses,
        xp: BASE_SESSION_XP + bonuses.reduce((sum, b) => sum + b.points, 0),
        newPrs: bonuses
            .filter((b) => b.type === 'weight-pr')
            .map((b) => ({ name: b.name, weight: String(b.value), reps: String(b.reps) }))
    }
}

// Total XP across all sessions. Bonuses are awarded against only the sessions
// that came BEFORE each one, so a record is credited the moment it is set and
// keeps its credit even after a later session beats it. "Always reward PRs".
export function totalXp(sessions) {
    const sorted = [...sessions].sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))
    let xp = 0
    const prior = []
    for (const s of sorted) {
        xp += sessionXp(s, prior)
        prior.push(s)
    }
    return xp
}

// Adds auto-detected PRs to the manual PR list, upgrading an existing entry
// for the same exercise when the new weight is heavier.
export function mergePrs(prs, newPrs) {
    const next = Array.isArray(prs) ? [...prs] : []
    for (const np of newPrs || []) {
        const idx = next.findIndex((p) => String(p.name).toLowerCase() === String(np.name).toLowerCase())
        if (idx === -1) {
            next.push(np)
        } else if ((parseWeight(next[idx].weight) ?? 0) < (parseWeight(np.weight) ?? 0)) {
            next[idx] = np
        }
    }
    return next
}

// Derives the personal-records list purely from saved sessions. Deleting a
// session therefore removes any PR that only existed in it.
export function computePrsFromSessions(sessions) {
    const index = buildHistoryIndex(sessions || [])
    const prs = []
    for (const [name, entry] of Object.entries(index)) {
        if (entry.bestWeight === -Infinity) continue
        prs.push({ name, weight: String(entry.bestWeight), reps: String(entry.bestRepsAtWeight?.[entry.bestWeight] || '') })
    }
    return prs
}

export function totalLoggedSets(sessions) {
    return sessions.reduce(
        (sum, s) => sum + (Array.isArray(s?.exercises) ? s.exercises : []).reduce((a, ex) => a + loggedSetsOf(ex), 0),
        0
    )
}

export function rankForXp(xp) {
    let level = 1
    for (let i = 2; i <= MAX_LEVEL; i++) {
        if (xp >= xpThresholdForLevel(i)) level = i
        else break
    }
    const rank = RANKS[level - 1]
    const threshold = xpThresholdForLevel(level)
    const nextThreshold = level < MAX_LEVEL ? xpThresholdForLevel(level + 1) : null
    const progress = nextThreshold ? Math.min((xp - threshold) / (nextThreshold - threshold), 1) : 1
    return {
        level,
        name: rank.name,
        color: rank.color,
        icon: rank.icon,
        xp,
        threshold,
        nextThreshold,
        progress
    }
}

// ---------------------------------------------------------------------------
// Per-exercise ranks (weight-based, relative to bodyweight, minimum 8 reps)
// ---------------------------------------------------------------------------

export const EXERCISE_RANKS = [
    { name: 'Wood', color: '#a16207', threshold: 0.3 },
    { name: 'Bronze', color: '#cd7f32', threshold: 0.55 },
    { name: 'Silver', color: '#cbd5e1', threshold: 0.8 },
    { name: 'Gold', color: '#facc15', threshold: 1.0 },
    { name: 'Platinum', color: '#22d3ee', threshold: 1.25 },
    { name: 'Diamond', color: '#818cf8', threshold: 1.5 }
]

// Strength factor = the typical bodyweight multiple an intermediate lifter hits
// for that category. Weight score = weight / (bodyweight × factor), so a score
// of 1.0 always means "intermediate for your size" regardless of exercise.
const CATEGORY_FACTORS = {
    Chest: 1.0,
    Back: 1.1,
    Biceps: 0.4,
    Triceps: 0.5,
    Arms: 0.45,
    Shoulders: 0.7,
    Legs: 1.5,
    Core: 0.5,
    Cardio: 1.0
}

// Seconds that count as an "intermediate" effort for that category, so timer
// exercises use the exact same threshold table as weight lifts.
const CATEGORY_TIME_FACTORS = {
    Chest: 60,
    Back: 60,
    Biceps: 60,
    Triceps: 60,
    Arms: 60,
    Shoulders: 60,
    Legs: 60,
    Core: 90,
    Cardio: 600
}

export function strengthFactorForCategory(category) {
    return CATEGORY_FACTORS[category] ?? 1.0
}

export function timeFactorForCategory(category) {
    return CATEGORY_TIME_FACTORS[category] ?? 60
}

export function strengthScore({ weight, bodyweight, category }) {
    const bw = parseFloat(bodyweight)
    if (!bw || !(weight > 0)) return 0
    return weight / (bw * strengthFactorForCategory(category))
}

export function durationScore({ seconds, category }) {
    if (!(seconds > 0)) return 0
    return seconds / timeFactorForCategory(category)
}

export function exerciseRankForScore(score) {
    let tier = 0
    for (let i = 1; i < EXERCISE_RANKS.length; i++) {
        if (score >= EXERCISE_RANKS[i].threshold) tier = i
        else break
    }
    const current = EXERCISE_RANKS[tier]
    const next = tier < EXERCISE_RANKS.length - 1 ? EXERCISE_RANKS[tier + 1] : null
    return {
        tier,
        name: current.name,
        color: current.color,
        score,
        nextScore: next ? next.threshold : null,
        progress: next ? Math.min((score - current.threshold) / (next.threshold - current.threshold), 1) : 1
    }
}

// Best recorded effort per exercise across sessions: heaviest weight hit for
// 8+ reps, or the longest held time for timer exercises.
export function bestExerciseEffort(sessions) {
    const best = {}
    for (const s of sessions) {
        for (const ex of (s?.exercises || [])) {
            const mode = ex.mode === 'timer' ? 'timer' : 'weight'
            const entry = best[ex.name] || (best[ex.name] = { weight: 0, duration: 0, category: ex.category || null, mode })
            entry.category = entry.category || ex.category || exerciseMetaByName(ex.name)?.category || inferCategoryByName(ex.name) || null
            if (mode === 'timer') {
                for (const set of (ex?.sets || [])) {
                    const d = parseDurationSeconds(set?.reps)
                    if (d > entry.duration) entry.duration = d
                }
            } else {
                for (const set of (ex?.sets || [])) {
                    const r = parseReps(set?.reps)
                    const w = parseWeight(set?.weight)
                    if (w != null && r >= 8 && w > entry.weight) entry.weight = w
                }
            }
        }
    }
    return best
}

export function computeExerciseRanks(sessions, bodyweight = 0) {
    const best = bestExerciseEffort(sessions)
    return Object.entries(best)
        .map(([name, e]) => {
            const score = e.mode === 'timer'
                ? durationScore({ seconds: e.duration, category: e.category })
                : strengthScore({ weight: e.weight, bodyweight, category: e.category })
            return {
                name,
                category: e.category || 'Chest',
                mode: e.mode,
                score,
                weight: e.weight,
                duration: e.duration,
                rank: exerciseRankForScore(score)
            }
        })
        .sort((a, b) => b.score - a.score)
}

// ---------------------------------------------------------------------------
// Rank challenges (personal gates built from one chosen exercise per muscle
// group)
// ---------------------------------------------------------------------------
// Every user picks ONE exercise per muscle group (Chest, Back, Arms, Legs,
// Cardio) — from their schedule first, plus the full library — and those 5
// become their personal challenges. Each challenge uses the ladder of its
// group (Chest uses the bench ladder, Back the deadlift ladder, etc.), while
// bodyweight picks are scored on reps and cardio picks on duration. To
// advance a rank you must complete ALL 5 challenges at that rank's threshold
// AND have enough XP. The 8+ rep rule applies to every lift.

const BENCH_LADDER = [5, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120]
const SQUAT_LADDER = [20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130]
const DEADLIFT_LADDER = [20, 35, 50, 65, 80, 95, 110, 125, 140, 155, 170, 185]
const CURL_LADDER = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60]
const PULLUP_LADDER = [8, 10, 12, 14, 16, 18, 20, 22, 25, 28, 30, 35]
const CARDIO_LADDER = [2, 4, 6, 8, 10, 12, 15, 18, 22, 26, 30, 35]

// The five challenge groups. `categories` drives the picker (scheduled +
// library exercises shown for that group), `ladder` is the weight threshold
// ladder, and `defaultExercise` covers users who never picked.
export const CHALLENGE_GROUPS = [
    { key: 'chest', label: 'Chest', categories: ['Chest'], ladder: BENCH_LADDER, defaultExercise: 'Flat Bench Press' },
    { key: 'back', label: 'Back', categories: ['Back'], ladder: DEADLIFT_LADDER, defaultExercise: 'Deadlift' },
    { key: 'arms', label: 'Arms', categories: ['Biceps', 'Triceps', 'Arms'], ladder: CURL_LADDER, defaultExercise: 'Barbell Curl' },
    { key: 'legs', label: 'Legs', categories: ['Legs'], ladder: SQUAT_LADDER, defaultExercise: 'Squat' },
    { key: 'cardio', label: 'Cardio', categories: ['Cardio'], ladder: CARDIO_LADDER, defaultExercise: 'Sprint' }
]

export const DEFAULT_CHALLENGE_PICKS = {
    chest: 'Flat Bench Press',
    back: 'Deadlift',
    arms: 'Barbell Curl',
    legs: 'Squat',
    cardio: 'Sprint'
}

// Bodyweight exercises are scored on reps; plank-style holds on time.
const BODYWEIGHT_REPS = new Set([
    'pushup', 'pushups', 'pullup', 'pullups', 'chinup', 'chinups',
    'chestdip', 'chestdips', 'dips', 'tricepsdip', 'tricepsdips',
    'situp', 'situps', 'crunch', 'crunches', 'benchcrunch', 'declinesitup',
    'legraise', 'legraises', 'hanginglegraise', 'hanginglegraises',
    'burpee', 'burpees', 'mountainclimbers', 'jumpingjacks', 'woodchopper'
])
const TIMED_REPS = new Set(['plank', 'sideplank'])

function normalizeName(name) {
    return String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

// "2:30" -> 2.5 minutes, bare numbers treated as seconds -> minutes.
function parseDuration(v) {
    if (v == null) return 0
    const s = String(v).trim()
    if (!s || s === '—') return 0
    if (s.includes(':')) {
        const [m, sec] = s.split(':')
        return (parseFloat(m) || 0) + (parseFloat(sec) || 0) / 60
    }
    const n = parseFloat(s)
    return Number.isFinite(n) ? n / 60 : 0
}

// Best weight / reps / duration ever recorded per normalized exercise name.
// Weight and reps only count when the set had at least 8 reps — a 1RM-style
// single won't clear a challenge.
const MIN_CHALLENGE_REPS = 8

export function buildBestLifts(sessions) {
    const bests = {}
    for (const s of sessions) {
        for (const ex of (s?.exercises || [])) {
            const key = normalizeName(ex.name)
            if (!key) continue
            const b = bests[key] || (bests[key] = { weight: 0, reps: 0, duration: 0 })
            for (const set of (ex?.sets || [])) {
                const r = parseReps(set?.reps)
                if (r >= MIN_CHALLENGE_REPS) {
                    if (r > b.reps) b.reps = r
                    const w = parseWeight(set?.weight)
                    if (w != null && w > b.weight) b.weight = w
                }
                if (ex.mode === 'timer') {
                    const d = parseDuration(set?.reps)
                    if (d > b.duration) b.duration = d
                }
            }
        }
    }
    return bests
}

// Resolves a picked exercise into its scoring kind + ladder: cardio group and
// timer exercises always score on duration, bodyweight exercises on reps,
// everything else on weight using the group's ladder.
function resolveChallengeExercise(name, group, customExercises = []) {
    const key = normalizeName(name)
    const meta = exerciseMetaByName(name)
    const custom = customExercises.find((e) => normalizeName(e.name) === key)
    const mode = meta?.mode || custom?.mode || 'weight'
    if (group.key === 'cardio' || mode === 'timer' || TIMED_REPS.has(key)) {
        return { key, name, kind: 'duration', ladder: CARDIO_LADDER }
    }
    if (BODYWEIGHT_REPS.has(key)) {
        return { key, name, kind: 'reps', ladder: PULLUP_LADDER }
    }
    return { key, name, kind: 'weight', ladder: group.ladder }
}

export function challengesForLevel(picks = {}, customExercises = [], level) {
    const i = Math.max(0, Math.min(level - 1, MAX_LEVEL - 1))
    return CHALLENGE_GROUPS.map((g) => {
        const ex = resolveChallengeExercise(picks[g.key] || g.defaultExercise, g, customExercises)
        return {
            key: g.key,
            exerciseKey: ex.key,
            label: ex.name,
            kind: ex.kind,
            value: ex.ladder[i]
        }
    })
}

// A challenge is met when the user's best 8+ rep effort on THAT exercise
// reaches its ladder value at the rank.
function meetsTarget(bests, ch) {
    const b = bests[ch.exerciseKey]
    if (!b) return false
    if (ch.kind === 'weight') return b.weight >= ch.value
    if (ch.kind === 'reps') return b.reps >= ch.value
    if (ch.kind === 'duration') return b.duration >= ch.value
    return false
}

export function challengeStatusForLevel(sessions, level, picks = {}, customExercises = [], grantedLevel = 1) {
    const bests = buildBestLifts(sessions)
    return challengesForLevel(picks, customExercises, level).map((ch) => ({
        ...ch,
        done: level < grantedLevel || meetsTarget(bests, ch)
    }))
}

// Highest rank you may hold based on challenges alone (level 1 is always
// reachable). Completions cascade: clearing all 5 chosen challenges at rank
// L's thresholds unlocks L+1.
export function challengeEligibleLevel(sessions, picks = {}, customExercises = []) {
    const bests = buildBestLifts(sessions)
    let level = 1
    for (let L = 1; L <= MAX_LEVEL; L++) {
        const done = challengesForLevel(picks, customExercises, L).every((ch) => meetsTarget(bests, ch))
        if (!done) break
        level = L + 1
    }
    return Math.min(level, MAX_LEVEL)
}

export function challengesStatusForAll(sessions, picks = {}, customExercises = [], grantedLevel = 1) {
    const bests = buildBestLifts(sessions)
    return Array.from({ length: MAX_LEVEL }, (_, i) => {
        const level = i + 1
        const granted = level < grantedLevel
        return {
            level,
            groups: challengesForLevel(picks, customExercises, level).map((ch) => ({
                ...ch,
                done: granted || meetsTarget(bests, ch)
            }))
        }
    })
}

// The 5 picked challenge exercises. Missing groups fall back to sensible
// defaults so users who finished onboarding before this feature still have a
// full challenge set.
export async function getChallengePicks() {
    const row = await dbGet('meta', 'challengePicks')
    return { ...DEFAULT_CHALLENGE_PICKS, ...(row?.value || {}) }
}

export async function saveChallengePicks(picks) {
    await dbPut('meta', { key: 'challengePicks', value: picks })
}

// Starting rank granted during onboarding (1 = Rookie). All challenge groups
// up to but NOT including this rank are treated as complete, and the XP floor
// starts at that rank's threshold so an experienced user isn't stuck at Rookie.
export async function getStartRank() {
    const row = await dbGet('meta', 'startRank')
    return row?.value || 1
}

export async function saveStartRank(level) {
    await dbPut('meta', { key: 'startRank', value: level })
}

// ---------------------------------------------------------------------------
// Streak freezes (weekly allowance, auto-protect missed days)
// ---------------------------------------------------------------------------

export const FREEZES_PER_WEEK = 2

// Monday-anchored key for the week containing `date`, e.g. "2026-08-10".
export function weekKeyFor(date = new Date()) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const mondayOffset = (d.getDay() + 6) % 7
    d.setDate(d.getDate() - mondayOffset)
    return toDayKey(d)
}

export async function getFreezeState() {
    const row = await dbGet('meta', 'freezes')
    return row?.value || { weekKey: null, frozenDays: [] }
}

export async function saveFreezeState(state) {
    await dbPut('meta', { key: 'freezes', value: state })
}

export function availableFreezes(state, now = new Date()) {
    const week = weekKeyFor(now)
    if (!state || state.weekKey !== week) return FREEZES_PER_WEEK
    return Math.max(0, FREEZES_PER_WEEK - (state.frozenDays || []).length)
}

// Which missed days (after your last workout, excluding today and Sundays)
// should be frozen so the streak survives. `available` is how many freezes are
// left this week.
export function planFreezeProtection(sessions, frozenDays, now = new Date(), available = FREEZES_PER_WEEK) {
    const days = new Set(sessions.map((s) => toDayKey(s.createdAt)).filter(Boolean))
    if (days.size === 0 || available <= 0) return []
    const frozen = new Set(frozenDays || [])
    const toProtect = []
    const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    cursor.setDate(cursor.getDate() - 1)
    while (toProtect.length < available) {
        const key = toDayKey(cursor)
        if (days.has(key)) break
        if (!frozen.has(key) && cursor.getDay() !== 0) toProtect.push(key)
        cursor.setDate(cursor.getDate() - 1)
    }
    return toProtect.reverse()
}

// Reads state, consumes freezes for the current gap, and persists. Returns the
// days that were frozen plus the fresh state.
export async function applyFreezeProtection(now = new Date()) {
    const [sessions, state] = await Promise.all([getSessions(), getFreezeState()])
    const week = weekKeyFor(now)
    const current = state?.weekKey === week ? state : { weekKey: week, frozenDays: [] }
    const available = FREEZES_PER_WEEK - (current.frozenDays || []).length
    if (available <= 0) return { protectedDays: [], available, frozenDays: current.frozenDays }
    const toProtect = planFreezeProtection(sessions, current.frozenDays, now, available)
    if (toProtect.length) {
        const next = { ...current, frozenDays: [...(current.frozenDays || []), ...toProtect] }
        await saveFreezeState(next)
        return { protectedDays: toProtect, available: FREEZES_PER_WEEK - next.frozenDays.length, frozenDays: next.frozenDays }
    }
    return { protectedDays: [], available, frozenDays: current.frozenDays }
}

// Streak with freeze protection: consecutive days (ending today or yesterday)
// where each day is either a workout day or a protected (frozen) day.
export function computeStreakWithFreezes(sessions, frozenDays = [], now = new Date()) {
    const days = new Set(sessions.map((s) => toDayKey(s.createdAt)).filter(Boolean))
    if (!days.size) return 0
    const frozen = new Set(frozenDays || [])
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const cursor = new Date(today)
    if (!days.has(toDayKey(cursor)) && !frozen.has(toDayKey(cursor))) {
        cursor.setDate(cursor.getDate() - 1)
    }
    if (!days.has(toDayKey(cursor)) && !frozen.has(toDayKey(cursor))) return 0
    let streak = 0
    while (days.has(toDayKey(cursor)) || frozen.has(toDayKey(cursor))) {
        streak += 1
        cursor.setDate(cursor.getDate() - 1)
    }
    return streak
}

// ---------------------------------------------------------------------------
// Progression snapshot + celebration state
// ---------------------------------------------------------------------------

export function computeProgress({ sessions, frozenDays = [], now = new Date(), startRank = 1, bodyweight = 0, picks = {}, customExercises = [] }) {
    const xp = Math.max(totalXp(sessions), xpThresholdForLevel(startRank))
    const xpRank = rankForXp(xp)
    const eligible = Math.max(startRank, challengeEligibleLevel(sessions, picks, customExercises))
    const level = Math.min(xpRank.level, eligible)
    const threshold = xpThresholdForLevel(level)
    const nextThreshold = level < MAX_LEVEL ? xpThresholdForLevel(level + 1) : null
    const streak = computeStreakWithFreezes(sessions, frozenDays, now)
    const exerciseRanks = computeExerciseRanks(sessions, bodyweight)
    return {
        xp,
        rank: {
            ...xpRank,
            level,
            threshold,
            nextThreshold,
            progress: nextThreshold ? Math.min((xp - threshold) / (nextThreshold - threshold), 1) : 1
        },
        streak,
        exerciseRanks,
        totalSets: totalLoggedSets(sessions),
        workoutCount: sessions.length,
        challenges: challengesStatusForAll(sessions, picks, customExercises, startRank)
    }
}

// Persisted marker used only to detect level-ups so we can celebrate them
// exactly once. Never the source of truth for XP.
export async function getProgressionState() {
    const row = await dbGet('meta', 'progression')
    // Everyone starts at Rookie level 1, so a fresh account never celebrates
    // "reaching" their starting rank.
    return row?.value || { lastLevel: 1 }
}

export async function saveProgressionState(state) {
    await dbPut('meta', { key: 'progression', value: state })
}

// Computes everything, compares against the persisted level marker, and
// returns { progress, isLevelUp } while recording the new marker.
export async function refreshProgress(now = new Date()) {
    const [sessions, freezeState, marker, startRank, profile, picks, customExercises] = await Promise.all([
        getSessions(),
        getFreezeState(),
        getProgressionState(),
        getStartRank(),
        getUserProfile(),
        getChallengePicks(),
        getCustomExercises()
    ])
    const bodyweight = parseFloat(profile?.weight) || 0
    const progress = computeProgress({ sessions, frozenDays: freezeState.frozenDays, now, startRank, bodyweight, picks, customExercises })
    const wasLevel = marker.lastLevel || 0
    const isLevelUp = progress.rank.level > wasLevel
    if (isLevelUp) {
        await saveProgressionState({ lastLevel: Math.max(wasLevel, progress.rank.level) })
    }
    return { progress, isLevelUp }
}
