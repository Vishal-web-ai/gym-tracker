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
// Personal records (PRs)
// ---------------------------------------------------------------------------

export async function getPrs() {
    const row = await dbGet('meta', 'prs')
    return row?.value || []
}

export async function savePrs(prs) {
    await dbPut('meta', { key: 'prs', value: prs })
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
