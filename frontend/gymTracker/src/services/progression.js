import { dbGet, dbPut } from './idb'
import { getSessions, toDayKey, getUserProfile, getCustomExercises, getLadders, saveLadders } from './storage'
import { exerciseMetaByName, inferCategoryByName, inferEquipmentByName } from './exercises'

// ---------------------------------------------------------------------------
// Ranks (player level ladder, driven by total XP)
// ---------------------------------------------------------------------------

export const RANKS = [
    { name: 'Rookie', color: '#9ca3af', icon: '/badge/rookie.png' },
    { name: 'Beginner', color: '#a3e635', icon: '/badge/begineer.png' },
    { name: 'Learner', color: '#38bdf8', icon: '/badge/learner.png' },
    { name: 'Intermediate', color: '#34d399', icon: '/badge/Intermediate.png' },
    { name: 'Skilled', color: '#fbbf24', icon: '/badge/skilled.png' },
    { name: 'Strong', color: '#fb923c', icon: '/badge/strong.png' },
    { name: 'Pro', color: '#f97316', icon: '/badge/pro.png' },
    { name: 'Elite', color: '#f43f5e', icon: '/badge/elite.png' },
    { name: 'Master', color: '#a855f7', icon: '/badge/master.png' },
    { name: 'Grandmaster', color: '#e879f9', icon: '/badge/grandmaster.png' },
    { name: 'Champion', color: '#facc15', icon: '/badge/champion.png' },
    { name: 'Legend', color: '#fde047', icon: '/badge/legend.png' }
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

// Per-exercise bonuses against a history index. Returns an array of bonus
// objects (one per set that improves on the record). A weight PR (+10) takes
// priority over an extra-rep bonus (+5) for the same set; they never stack.
// Running bests are tracked across sets within the session so each
// improvement is counted individually. When there is no history entry for an
// exercise, the first set establishes the baseline (no bonus) and subsequent
// sets can trigger bonuses by beating it.
function exerciseBonus(ex, index) {
    const sets = (ex?.sets || []).filter((s) => {
        const v = s?.reps
        return v != null && String(v).trim() !== '' && String(v).trim() !== '—'
    })
    if (!sets.length) return []
    const entry = index[ex.name]

    if (ex.mode === 'timer') {
        const bonuses = []
        let runningBest = entry ? entry.bestDuration : 0
        let firstSet = !entry
        for (const s of sets) {
            const duration = parseDurationSeconds(s.reps)
            if (firstSet) {
                runningBest = duration
                firstSet = false
                continue
            }
            if (duration > runningBest) {
                bonuses.push({ type: 'timer-record', points: PR_XP, name: ex.name, value: duration })
                runningBest = duration
            }
        }
        return bonuses
    }

    const bonuses = []
    let runningBestWeight = entry ? (entry.bestWeight != null ? entry.bestWeight : -Infinity) : null
    const runningBestReps = entry ? { ...(entry.bestRepsAtWeight || {}) } : {}
    let firstSet = !entry

    for (const s of sets) {
        const w = parseWeight(s.weight)
        const r = parseReps(s.reps)
        if (w == null) continue

        if (firstSet) {
            runningBestWeight = w
            runningBestReps[w] = r
            firstSet = false
            continue
        }

        if (w > runningBestWeight) {
            bonuses.push({ type: 'weight-pr', points: PR_XP, name: ex.name, value: w, reps: r })
            runningBestWeight = w
            runningBestReps[w] = r
        } else if (r > (runningBestReps[w] || 0)) {
            bonuses.push({ type: 'extra-rep', points: EXTRA_REP_XP, name: ex.name, value: r, weight: w })
            runningBestReps[w] = r
        }
    }
    return bonuses
}

// XP for one saved session: a flat base plus per-exercise bonuses. `history`
// is every OTHER session (used to detect records). No bonuses are awarded the
// first time an exercise appears (no prior record to beat).
export function sessionXp(session, history = []) {
    return analyzeSession(session, history).xp
}

// Full breakdown of a session's rewards, including the PRs it should add to
// the manual PR list.
export function analyzeSession(session, history = []) {
    const index = buildHistoryIndex(history)
    const bonuses = []
    for (const ex of (session?.exercises || [])) {
        const bs = exerciseBonus(ex, index)
        if (bs.length) bonuses.push(...bs)
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
// that came BEFORE each one. No bonus is given the first time an exercise
// appears (no prior record to beat).
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
    next.sort((a, b) => String(a.name).localeCompare(String(b.name), undefined, { sensitivity: 'base' }))
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
// Exercise badge ladders (hybrid: bodyweight seeds the START, actual 5-rep
// performance drives every step after that). Each exercise climbs its own
// chain — one successful challenge = one level — so nothing here can cap a
// strong user. Levels are chain positions, not bodyweight multiples.
// ---------------------------------------------------------------------------

const LEVEL_COLORS = ['#34d399', '#38bdf8', '#a855f7', '#f97316', '#f43f5e', '#facc15']
export function colorForLevel(level) {
    return LEVEL_COLORS[(Math.max(1, level) - 1) % LEVEL_COLORS.length]
}

// Strength factor = the typical bodyweight multiple an intermediate lifter hits
// for that category. Used ONLY for initial placement (beginner targets and
// history seeding) — never as a progression ceiling.
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
// exercises mirror the weight ladder in time.
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

function strengthFactorForCategory(category) {
    return CATEGORY_FACTORS[category] ?? 1.0
}

function timeFactorForCategory(category) {
    return CATEGORY_TIME_FACTORS[category] ?? 60
}

// Equipment loading class → multiplier on the starting target only. Machines
// and cables let you move more iron than free weights for the same muscles;
// dumbbell names assume the logged weight is per-hand.
const EQUIPMENT_FACTORS = { barbell: 1.0, machine: 0.75, cable: 0.55, dumbbell: 0.4, bodyweight: 1.0 }

// Fraction of an intermediate effort a brand-new user starts at — deliberately
// achievable so the first badge comes fast and motivation sticks.
const BEGINNER_SEED = 0.3

function roundTo(value, step) {
    return Math.round(value / step) * step
}

// Practical gym increments: ~8% up, rounded to available plates, never under
// +2.5kg. Example chain: 30 → 32.5 → 35 → 37.5.
export function nextWeightTarget(lastSuccess) {
    return Math.max(roundTo(lastSuccess * 1.08, 2.5), lastSuccess + 2.5)
}

// Timer mirror: ~10% longer holds, rounded to 5s, never under +5s.
export function nextTimeTarget(lastSuccess) {
    return Math.max(roundTo(lastSuccess * 1.1, 5), lastSuccess + 5)
}

// Initial placement ONLY. The first challenge is a fraction of an
// intermediate effort so beginners earn Bronze quickly; strong users skip
// ahead via seedLaddersFromHistory instead of grinding from here.
export function beginnerTarget({ bodyweight, category, mode, name }) {
    if (mode === 'timer') {
        return Math.max(15, roundTo(timeFactorForCategory(category) * BEGINNER_SEED, 5))
    }
    const bw = parseFloat(bodyweight) || 60
    const equip = EQUIPMENT_FACTORS[inferEquipmentByName(name)] ?? 1.0
    return Math.max(2.5, roundTo(bw * strengthFactorForCategory(category) * equip * BEGINNER_SEED, 2.5))
}

function badgeFor(successes) {
    if (!(successes > 0)) return null
    return { tier: successes, name: `Level ${successes}`, color: colorForLevel(successes) }
}

// Best recorded effort per exercise across sessions: heaviest weight hit for
// 5+ reps, or the longest held time for timer exercises.
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
                    if (w != null && r >= MIN_CHALLENGE_REPS && w > entry.weight) entry.weight = w
                }
            }
        }
    }
    return best
}

// Builds ladders for every exercise found in history without touching entries
// that already exist — earned progress is never recalculated. Every exercise
// starts at Level 1 with the best recorded effort as the baseline.
export function seedLaddersFromHistory(sessions, bodyweight = 0, existing = {}) {
    const best = bestExerciseEffort(sessions)
    const next = { ...existing }
    let changed = false
    for (const [name, e] of Object.entries(best)) {
        if (next[name] && !(next[name].successes === 0 && next[name].lastSuccess > 0)) continue
        const perf = e.mode === 'timer' ? e.duration : e.weight
        if (!(perf > 0)) continue
        const category = e.category || 'Chest'
        const stepFn = e.mode === 'timer' ? nextTimeTarget : nextWeightTarget
        next[name] = {
            mode: e.mode,
            category,
            startTarget: perf,
            lastSuccess: perf,
            personalBest: perf,
            nextTarget: stepFn(perf),
            successes: 1,
            highestLevel: 1,
            bodyweightAtTime: parseFloat(bodyweight) || null,
            updatedAt: new Date().toISOString()
        }
        changed = true
    }
    return changed ? next : null
}

// Evaluates one saved session against the ladders. A set completes the current
// challenge when it reaches the target with 8+ valid reps (timer: matches the
// hold time). The actually-performed weight becomes the base for the next
// target — bodyweight is never re-applied after initial placement. Failing
// reps or weight keeps the level and target untouched.
export function applySessionToLadders(ladders, session, bodyweight = 0, now = new Date()) {
    const next = { ...ladders }
    const promotions = []
    for (const ex of (session?.exercises || [])) {
        const isTimer = ex.mode === 'timer'
        let entry = next[ex.name] ? { ...next[ex.name] } : null
        if (!entry) {
            const category = ex.category || exerciseMetaByName(ex.name)?.category || inferCategoryByName(ex.name) || 'Chest'

            let perf = 0
            if (isTimer) {
                for (const s of (ex?.sets || [])) perf = Math.max(perf, parseDurationSeconds(s?.reps))
            } else {
                for (const s of (ex?.sets || [])) {
                    const r = parseReps(s?.reps)
                    const w = parseWeight(s?.weight)
                    if (r >= MIN_CHALLENGE_REPS && w != null && w > perf) perf = w
                }
            }

            if (perf > 0) {
                const stepFn = isTimer ? nextTimeTarget : nextWeightTarget
                let successes = 1
                let target = perf
                while (successes < 1000) {
                    const nextTarget = stepFn(target)
                    if (perf < nextTarget) break
                    target = nextTarget
                    successes++
                }
                entry = {
                    mode: isTimer ? 'timer' : 'weight',
                    category,
                    startTarget: perf,
                    lastSuccess: perf,
                    personalBest: perf,
                    nextTarget: stepFn(target),
                    successes,
                    highestLevel: successes,
                    bodyweightAtTime: parseFloat(bodyweight) || null,
                    updatedAt: now.toISOString()
                }
                const badge = badgeFor(successes)
                promotions.push({ exerciseName: ex.name, ...badge })
                next[ex.name] = entry
                continue
            }

            const start = beginnerTarget({ bodyweight, category, mode: isTimer ? 'timer' : 'weight', name: ex.name })
            entry = {
                mode: isTimer ? 'timer' : 'weight',
                category,
                startTarget: start,
                lastSuccess: null,
                personalBest: 0,
                nextTarget: start,
                successes: 0,
                highestLevel: 0,
                bodyweightAtTime: parseFloat(bodyweight) || null,
                updatedAt: now.toISOString()
            }
        }
        let perf = 0
        if (isTimer) {
            for (const s of (ex?.sets || [])) perf = Math.max(perf, parseDurationSeconds(s?.reps))
        } else {
            for (const s of (ex?.sets || [])) {
                const r = parseReps(s?.reps)
                const w = parseWeight(s?.weight)
                if (r >= MIN_CHALLENGE_REPS && w != null && w > perf) perf = w
            }
        }
        if (perf > (entry.personalBest || 0)) entry.personalBest = perf
        const prevTier = entry.successes || 0
        if (perf > 0 && perf >= entry.nextTarget) {
            const stepFn = isTimer ? nextTimeTarget : nextWeightTarget
            let levelUps = 0
            let target = entry.nextTarget
            while (perf >= target) {
                levelUps++
                target = stepFn(target)
            }
            entry.successes = (entry.successes || 0) + levelUps
            entry.lastSuccess = perf
            entry.nextTarget = stepFn(target)
            if (bodyweight) entry.bodyweightAtTime = parseFloat(bodyweight)
            entry.updatedAt = now.toISOString()
            const badge = badgeFor(entry.successes)
            if (badge.tier > prevTier) promotions.push({ exerciseName: ex.name, ...badge })
        }
        entry.highestLevel = Math.max(entry.highestLevel || 0, entry.successes || 0)
        next[ex.name] = entry
    }
    return { ladders: next, promotions }
}

export async function ensureLadders(sessions, bodyweight = 0) {
    const existing = await getLadders()
    const seeded = seedLaddersFromHistory(sessions, bodyweight, existing)
    if (!seeded) return existing
    await saveLadders(seeded)
    return seeded
}

// Call after a session is saved. Persists ladder advances and returns the new
// badges so the UI can celebrate them exactly once.
export async function recordSessionLadders(session, bodyweight = 0) {
    const current = await getLadders()
    const { ladders, promotions } = applySessionToLadders(current, session, bodyweight)
    await saveLadders(ladders)
    return { ladders, promotions }
}

// Display-ready view. Relative strength uses CURRENT bodyweight, so gaining
// or losing weight updates the ratio without ever touching earned progress.
export function ladderView(entry, bodyweight = 0) {
    const badge = badgeFor(entry.successes)
    const bw = parseFloat(bodyweight) || entry.bodyweightAtTime || 0
    const ref = entry.lastSuccess || 0
    return {
        mode: entry.mode,
        category: entry.category,
        successes: entry.successes || 0,
        tier: badge?.tier || 0,
        levelName: badge?.name || 'Unranked',
        color: badge?.color || '#737373',
        startTarget: entry.startTarget,
        lastSuccess: entry.lastSuccess ?? null,
        personalBest: entry.personalBest || 0,
        nextTarget: entry.nextTarget,
        strengthRatio: bw > 0 && ref > 0 ? Math.round((ref / bw) * 100) / 100 : null,
        progress: entry.nextTarget > 0 ? Math.min((entry.personalBest || 0) / entry.nextTarget, 1) : 0
    }
}

export function computeExerciseLadders(ladders = {}, bodyweight = 0) {
    return Object.entries(ladders)
        .map(([name, entry]) => ({ name, ...ladderView(entry, bodyweight) }))
        .sort((a, b) => String(a.name).localeCompare(String(b.name), undefined, { sensitivity: 'base' }))
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

const BENCH_LADDER = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120]
const SQUAT_LADDER = [20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130]
const LEG_PRESS_LADDER = [60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360, 390]
const DEADLIFT_LADDER = [20, 35, 50, 65, 80, 95, 110, 130, 150, 170, 190, 210]
const CURL_LADDER = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60]
const PULLUP_LADDER = [8, 10, 12, 14, 16, 18, 20, 22, 25, 28, 30, 35]
const CARDIO_LADDER = [2, 4, 6, 8, 10, 12, 15, 18, 22, 26, 30, 35]

// A custom challenge time becomes the Rookie target; higher ranks follow the
// default cardio ladder's shape scaled from it.
export function scaledCardioLadder(baseMinutes) {
    return CARDIO_LADDER.map((v) => Math.round(((v * baseMinutes) / CARDIO_LADDER[0]) * 2) / 2)
}

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

// Free-text challenge time -> minutes: "2:30" -> 2.5, "90s" -> 1.5, "5m" -> 5,
// bare numbers are seconds (same convention as logged timer sets).
export function parseChallengeTime(v) {
    const s = String(v ?? '').trim().toLowerCase()
    if (!s) return null
    let m = s.match(/^(\d+):([0-5]?\d)$/)
    if (m) return +m[1] + +m[2] / 60
    m = s.match(/^(\d+(?:\.\d+)?)\s*(s|sec|secs|second|seconds)$/)
    if (m) return +m[1] / 60
    m = s.match(/^(\d+(?:\.\d+)?)\s*(m|min|mins|minute|minutes)$/)
    if (m) return +m[1]
    m = s.match(/^\d+(?:\.\d+)?$/)
    if (m) return parseFloat(s) / 60
    return null
}

// Minutes -> editable text ("5" -> "5m", "2.5" -> "2:30").
export function formatChallengeTime(min) {
    if (!min || min <= 0) return ''
    if (Number.isInteger(min)) return `${min}m`
    const secs = Math.round((min % 1) * 60)
    return `${Math.floor(min)}:${String(secs).padStart(2, '0')}`
}

// Best weight / reps / duration ever recorded per normalized exercise name.
// Weight and reps only count when the set had at least 5 reps — a 1RM-style
// single won't clear a challenge.
const MIN_CHALLENGE_REPS = 5

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
        const t = Number(custom?.challengeTime)
        return { key, name, kind: 'duration', ladder: t > 0 ? scaledCardioLadder(t) : CARDIO_LADDER }
    }
    if (BODYWEIGHT_REPS.has(key)) {
        return { key, name, kind: 'reps', ladder: PULLUP_LADDER }
    }
    if (group.key === 'legs' && key.includes('legpress')) {
        return { key, name, kind: 'weight', ladder: LEG_PRESS_LADDER }
    }
    return { key, name, kind: 'weight', ladder: group.ladder }
}

export function challengesForLevel(picks = {}, customExercises = [], level) {
    const i = Math.max(0, Math.min(level - 1, MAX_LEVEL - 1))
    // A pick of null opts that group out of rank challenges entirely.
    return CHALLENGE_GROUPS
        .filter((g) => picks[g.key] !== null)
        .map((g) => {
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

export function computeProgress({ sessions, frozenDays = [], now = new Date(), startRank = 1, bodyweight = 0, picks = {}, customExercises = [], ladders = {} }) {
    const xp = Math.max(totalXp(sessions), xpThresholdForLevel(startRank))
    const xpRank = rankForXp(xp)
    const eligible = Math.max(startRank, challengeEligibleLevel(sessions, picks, customExercises))
    const level = Math.min(xpRank.level, eligible)
    const threshold = xpThresholdForLevel(level)
    const nextThreshold = level < MAX_LEVEL ? xpThresholdForLevel(level + 1) : null
    const streak = computeStreakWithFreezes(sessions, frozenDays, now)
    const exerciseRanks = computeExerciseLadders(ladders, bodyweight)
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
    const ladders = await ensureLadders(sessions, bodyweight)
    const progress = computeProgress({ sessions, frozenDays: freezeState.frozenDays, now, startRank, bodyweight, picks, customExercises, ladders })
    const wasLevel = marker.lastLevel || 0
    const isLevelUp = progress.rank.level > wasLevel
    if (isLevelUp) {
        await saveProgressionState({ lastLevel: Math.max(wasLevel, progress.rank.level) })
    }
    return { progress, isLevelUp, ladders }
}
