import { dbGetAll, dbGet, dbPut, dbDelete } from './idb'

export async function getSessions() {
    const sessions = await dbGetAll('sessions')
    return sessions.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
}

export async function createSession(data) {
    const now = new Date().toISOString()
    const session = {
        id: crypto.randomUUID(),
        ...data,
        createdAt: now,
        updatedAt: now
    }
    await dbPut('sessions', session)
    return session
}

export async function renameSession(id, name) {
    const session = await dbGet('sessions', id)
    if (!session) return null
    const updated = { ...session, name, updatedAt: new Date().toISOString() }
    await dbPut('sessions', updated)
    return updated
}

export async function deleteSession(id) {
    const session = await dbGet('sessions', id)
    if (session?.exercises) {
        for (const ex of session.exercises) {
            for (const m of (ex.media || [])) {
                try {
                    const { deleteMedia } = await import('./media')
                    await deleteMedia(m.id)
                } catch { /* best effort */ }
            }
        }
    }
    await dbDelete('sessions', id)
}

// Removes a media reference from a saved session's exercise. Returns the
// updated session, or null if the session/exercise/media was not found.
export async function removeExerciseMedia(sessionId, exerciseIndex, mediaId) {
    const session = await dbGet('sessions', sessionId)
    const media = session?.exercises?.[exerciseIndex]?.media
    if (!media || !media.some(m => m.id === mediaId)) return null
    const updated = {
        ...session,
        exercises: session.exercises.map((ex, i) =>
            i === exerciseIndex
                ? { ...ex, media: media.filter(m => m.id !== mediaId) }
                : ex
        ),
        updatedAt: new Date().toISOString()
    }
    await dbPut('sessions', updated)
    return updated
}

export async function getCustomExercises() {
    const exercises = await dbGetAll('exercises')
    return exercises.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
}

export async function createExercise(data) {
    const now = new Date().toISOString()
    const exercise = {
        id: crypto.randomUUID(),
        ...data,
        createdAt: now,
        updatedAt: now
    }
    await dbPut('exercises', exercise)
    return exercise
}

export async function updateExercise(id, data) {
    const exercise = await dbGet('exercises', id)
    if (!exercise) return null
    const updated = { ...exercise, ...data, id, updatedAt: new Date().toISOString() }
    await dbPut('exercises', updated)
    return updated
}

export async function deleteExercise(id) {
    await dbDelete('exercises', id)
}

export async function getName() {
    const row = await dbGet('meta', 'name')
    return row?.value || 'Vishal'
}

export async function setName(name) {
    await dbPut('meta', { key: 'name', value: name })
}

// ---------------------------------------------------------------------------
// User profile (onboarding)
// ---------------------------------------------------------------------------

export async function getUserProfile() {
    const row = await dbGet('meta', 'profile')
    return row?.value || {}
}

export async function saveUserProfile(profile) {
    const existing = await getUserProfile()
    await dbPut('meta', { key: 'profile', value: { ...existing, ...profile } })
}

// ---------------------------------------------------------------------------
// Weekly workout schedule
// ---------------------------------------------------------------------------

export async function getSchedule() {
    const row = await dbGet('meta', 'schedule')
    return row?.value || {}
}

export async function saveSchedule(schedule) {
    await dbPut('meta', { key: 'schedule', value: schedule })
}

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

export function getDayKey(date = new Date()) {
    return DAY_KEYS[date.getDay()]
}

// Exercises scheduled for a given date (defaults to today). Returns a list of
// `{ name }` items, empty when the day is a rest day or no schedule exists.
export function getTodaysExercises(schedule, date = new Date()) {
    const list = schedule?.[getDayKey(date)]
    return Array.isArray(list) ? list.filter(e => e?.name) : []
}

// ---------------------------------------------------------------------------
// Exercise badge ladders (per-exercise hybrid progression state)
// ---------------------------------------------------------------------------

export async function getLadders() {
    const row = await dbGet('meta', 'ladders')
    return row?.value || {}
}

export async function saveLadders(ladders) {
    await dbPut('meta', { key: 'ladders', value: ladders })
}

// ---------------------------------------------------------------------------
// Rest timer alarm sound ({ name, blob } or null for the default beep)
// ---------------------------------------------------------------------------

export async function getRestSound() {
    const row = await dbGet('meta', 'restSound')
    return row?.value || null
}

export async function saveRestSound(sound) {
    await dbPut('meta', { key: 'restSound', value: sound })
}

// ---------------------------------------------------------------------------
// Stats derived from saved session history
// ---------------------------------------------------------------------------

export function toDayKey(iso) {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return null
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Number of distinct days with at least one session in the current month.
export function computeMonthlyCount(sessions, now = new Date()) {
    const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    return new Set(
        sessions
            .map(s => toDayKey(s.createdAt))
            .filter(key => key && key.startsWith(prefix))
    ).size
}

// Consecutive-day streak ending today or yesterday (so a missed evening or an
// in-progress day doesn't break the run). 0 when there's no workout yet or the
// last workout was more than a day ago.
export function computeStreak(sessions, now = new Date()) {
    const dayKeys = [...new Set(sessions.map(s => toDayKey(s.createdAt)).filter(Boolean))].sort()
    if (!dayKeys.length) return 0

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const last = new Date(`${dayKeys[dayKeys.length - 1]}T00:00:00`)
    const gapDays = Math.round((today - last) / 86400000)
    if (gapDays > 1) return 0

    const days = new Set(dayKeys)
    let streak = 0
    let cursor = new Date(last)
    while (days.has(toDayKey(cursor))) {
        streak += 1
        cursor.setDate(cursor.getDate() - 1)
    }
    return streak
}

// Consecutive "consistent" days: how many days the user has kept training,
// counting backwards from today (or yesterday). Any scheduled workout day that
// was skipped breaks the run and resets the counter to 0, while scheduled rest
// days (weekdays with no exercises in the schedule) never break it. Today is
// never treated as a miss because the workout may still be in progress. With no
// schedule to define rest days, every missed day breaks the run.
export function computeConsistencyStreak(sessions, schedule = {}, now = new Date()) {
    const dayKeys = [...new Set(sessions.map(s => toDayKey(s.createdAt)).filter(Boolean))].sort()
    if (!dayKeys.length) return 0
    const attended = new Set(dayKeys)

    // Weekday names that carry at least one scheduled exercise.
    const workDays = new Set(
        Object.entries(schedule || {})
            .filter(([, list]) => Array.isArray(list) && list.length > 0)
            .map(([day]) => day)
    )
    if (!workDays.size) return computeStreak(sessions, now)

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const last = new Date(`${dayKeys[dayKeys.length - 1]}T00:00:00`)

    // A scheduled workout day missed AFTER the last attendance ends the run —
    // today is excluded because it may still be in progress.
    for (let d = new Date(last); d.getTime() < today.getTime(); d.setDate(d.getDate() + 1)) {
        const key = toDayKey(d)
        if (workDays.has(getDayKey(d)) && !attended.has(key)) return 0
    }

    // Count backwards from the last attendance. Every attended day counts; an
    // unattended scheduled workout day breaks the run; rest days are skipped.
    let streak = 0
    let cursor = new Date(last)
    while (true) {
        if (attended.has(toDayKey(cursor))) streak += 1
        else if (workDays.has(getDayKey(cursor))) break
        cursor.setDate(cursor.getDate() - 1)
    }
    return streak
}

// All previous consistency runs (schedule-aware, same rule as
// computeConsistencyStreak). Returns runs in chronological order as
// { start, end, days, current }. Rest days never split a run; a missed
// scheduled workout day closes it; today's pending workout day never closes it.
export function computeConsistencyRuns(sessions, schedule = {}, now = new Date()) {
    const attended = new Set(sessions.map(s => toDayKey(s.createdAt)).filter(Boolean))
    if (!attended.size) return []

    let workDays = new Set(
        Object.entries(schedule || {})
            .filter(([, list]) => Array.isArray(list) && list.length > 0)
            .map(([day]) => day)
    )
    if (!workDays.size) workDays = new Set(DAY_KEYS)

    const first = new Date(`${[...attended].sort()[0]}T00:00:00`)
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayKey = toDayKey(today)
    const runs = []
    let open = null
    for (let d = new Date(first); d <= today; d.setDate(d.getDate() + 1)) {
        const key = toDayKey(d)
        const isWork = workDays.has(getDayKey(d))
        const did = attended.has(key)
        if (isWork && !did && key !== todayKey) {
            open = null
        } else if (did) {
            if (!open) {
                open = { start: key, end: key, days: 1 }
                runs.push(open)
            } else {
                open.end = key
                open.days += 1
            }
        }
    }
    if (open && runs.length) runs[runs.length - 1].current = true
    return runs
}

// Check whether at least one session was saved today.
export async function hasWorkoutToday() {
    const sessions = await getSessions()
    const todayKey = toDayKey(new Date())
    return sessions.some(s => toDayKey(s.createdAt) === todayKey)
}
