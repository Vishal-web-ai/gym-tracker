import { describe, it, expect, beforeEach } from 'vitest'
import {
    getSessions,
    createSession,
    renameSession,
    deleteSession,
    getCustomExercises,
    createExercise,
    updateExercise,
    deleteExercise,
    getName,
    setName,
    getUserProfile,
    saveUserProfile,
    getSchedule,
    saveSchedule,
    getDayKey,
    getTodaysExercises,
    computeMonthlyCount,
    computeStreak,
    computeConsistencyStreak,
    computeConsistencyRuns
} from '../storage'
import { dbPut } from '../idb'
import { resetDb } from '../../test/resetDb'

beforeEach(resetDb)

describe('storage', () => {
    it('creates, renames, and deletes sessions', async () => {
        const session = await createSession({ name: 'Chest Day' })
        expect(session.id).toBeTruthy()
        expect(session.createdAt).toBeTruthy()

        const renamed = await renameSession(session.id, 'Push Day')
        expect(renamed.name).toBe('Push Day')
        await expect(renameSession('missing', 'X')).resolves.toBeNull()

        await deleteSession(session.id)
        expect(await getSessions()).toEqual([])
    })

    it('sorts sessions newest first', async () => {
        await dbPut('sessions', { id: 'old', name: 'Old', createdAt: '2026-01-01T00:00:00Z' })
        await dbPut('sessions', { id: 'new', name: 'New', createdAt: '2026-02-01T00:00:00Z' })
        const sessions = await getSessions()
        expect(sessions[0].name).toBe('New')
        expect(sessions[1].name).toBe('Old')
    })

    it('creates, updates, and deletes exercises', async () => {
        const exercise = await createExercise({ name: 'Squat', category: 'Legs' })
        const updated = await updateExercise(exercise.id, { name: 'Front Squat' })
        expect(updated.name).toBe('Front Squat')

        const all = await getCustomExercises()
        expect(all).toHaveLength(1)
        expect(all[0].category).toBe('Legs')

        await deleteExercise(exercise.id)
        expect(await getCustomExercises()).toEqual([])
    })

    it('persists the user name', async () => {
        expect(await getName()).toBe('Vishal')
        await setName('Priya')
        expect(await getName()).toBe('Priya')
    })

    it('returns an empty profile before onboarding', async () => {
        expect(await getUserProfile()).toEqual({})
    })

    it('saves the profile and merges on each update', async () => {
        await saveUserProfile({ age: '25' })
        await saveUserProfile({ weight: '82', joinedAt: '2026-08-12T00:00:00Z' })
        expect(await getUserProfile()).toEqual({
            age: '25',
            weight: '82',
            joinedAt: '2026-08-12T00:00:00Z'
        })
    })

    it('persists the weekly schedule', async () => {
        expect(await getSchedule()).toEqual({})
        const schedule = { monday: [{ name: 'Flat Bench Press' }], wednesday: [{ name: 'Squat' }] }
        await saveSchedule(schedule)
        expect(await getSchedule()).toEqual(schedule)
    })

    it('maps dates to day keys', () => {
        expect(getDayKey(new Date('2026-08-10T12:00:00'))).toBe('monday')
        expect(getDayKey(new Date('2026-08-16T12:00:00'))).toBe('sunday')
    })

    it('returns today\'s scheduled exercises', () => {
        const schedule = { monday: [{ name: 'Squat' }], tuesday: [{ name: 'Deadlift' }, { name: 'Pull-Up' }] }
        expect(getTodaysExercises(schedule, new Date('2026-08-11T12:00:00'))).toEqual([
            { name: 'Deadlift' },
            { name: 'Pull-Up' }
        ])
    })

    it('returns an empty list on rest days and for missing schedules', () => {
        expect(getTodaysExercises({ monday: [{ name: 'Squat' }] }, new Date('2026-08-12T12:00:00'))).toEqual([])
        expect(getTodaysExercises(null, new Date('2026-08-10T12:00:00'))).toEqual([])
        expect(getTodaysExercises({}, new Date('2026-08-10T12:00:00'))).toEqual([])
    })
})

describe('stats', () => {
    const at = (iso) => ({ createdAt: iso })

    it('counts distinct workout days in the current month', () => {
        const now = new Date('2026-03-15T12:00:00')
        const sessions = [
            at('2026-03-01T10:00:00'),
            at('2026-03-01T18:00:00'),
            at('2026-03-02T09:00:00'),
            at('2026-02-28T09:00:00')
        ]
        expect(computeMonthlyCount(sessions, now)).toBe(2)
    })

    it('counts 0 workout days when there are no sessions this month', () => {
        expect(computeMonthlyCount([at('2026-02-01T09:00:00')], new Date('2026-03-15T12:00:00'))).toBe(0)
        expect(computeMonthlyCount([], new Date('2026-03-15T12:00:00'))).toBe(0)
    })

    it('counts a streak of consecutive days including today', () => {
        const now = new Date('2026-03-10T12:00:00')
        const sessions = [
            at('2026-03-08T09:00:00'),
            at('2026-03-09T09:00:00'),
            at('2026-03-10T09:00:00')
        ]
        expect(computeStreak(sessions, now)).toBe(3)
    })

    it('keeps a streak alive when the last workout was yesterday', () => {
        const now = new Date('2026-03-10T12:00:00')
        const sessions = [
            at('2026-03-08T09:00:00'),
            at('2026-03-09T09:00:00')
        ]
        expect(computeStreak(sessions, now)).toBe(2)
    })

    it('resets the streak when the last workout was more than a day ago', () => {
        const now = new Date('2026-03-10T12:00:00')
        const sessions = [
            at('2026-03-05T09:00:00'),
            at('2026-03-06T09:00:00')
        ]
        expect(computeStreak(sessions, now)).toBe(0)
    })

    it('ignores duplicate days when counting the streak', () => {
        const now = new Date('2026-03-10T12:00:00')
        const sessions = [
            at('2026-03-08T09:00:00'),
            at('2026-03-08T18:00:00'),
            at('2026-03-09T09:00:00'),
            at('2026-03-10T09:00:00')
        ]
        expect(computeStreak(sessions, now)).toBe(3)
    })

    it('returns 0 for an empty history', () => {
        expect(computeStreak([], new Date('2026-03-10T12:00:00'))).toBe(0)
    })

    it('keeps the consistency count alive across scheduled rest days', () => {
        // Mon, Tue, Thu, Fri are workdays (Wed + weekend rest).
        const schedule = { monday: [{}], tuesday: [{}], thursday: [{}], friday: [{}] }
        const now = new Date('2026-03-12T12:00:00') // Thursday
        const sessions = [
            at('2026-03-09T09:00:00'), // Mon
            at('2026-03-10T09:00:00'), // Tue
            at('2026-03-12T09:00:00')  // Thu
        ]
        expect(computeConsistencyStreak(sessions, schedule, now)).toBe(3)
    })

    it('resets to 0 when a scheduled workday before today was missed', () => {
        const schedule = { monday: [{}], tuesday: [{}], thursday: [{}], friday: [{}] }
        const now = new Date('2026-03-13T12:00:00') // Friday
        const sessions = [
            at('2026-03-09T09:00:00'), // Mon
            at('2026-03-10T09:00:00')  // Tue — Thu was skipped
        ]
        expect(computeConsistencyStreak(sessions, schedule, now)).toBe(0)
    })

    it('keeps the count alive while todays workday is still pending', () => {
        const schedule = { monday: [{}], tuesday: [{}], thursday: [{}], friday: [{}] }
        const now = new Date('2026-03-13T12:00:00') // Friday
        const sessions = [
            at('2026-03-09T09:00:00'), // Mon
            at('2026-03-10T09:00:00'), // Tue
            at('2026-03-12T09:00:00')  // Thu
        ]
        expect(computeConsistencyStreak(sessions, schedule, now)).toBe(3)
    })

    it('fallbacks to strict consecutive days when no schedule is set', () => {
        const now = new Date('2026-03-12T12:00:00')
        const sessions = [at('2026-03-10T09:00:00'), at('2026-03-12T09:00:00')]
        expect(computeConsistencyStreak(sessions, {}, now)).toBe(computeStreak(sessions, now))
    })

    it('returns runs that keep rest days inside one run', () => {
        const schedule = { monday: [{}], tuesday: [{}], thursday: [{}], friday: [{}] }
        const now = new Date('2026-03-13T12:00:00') // Friday
        const sessions = [
            at('2026-03-09T09:00:00'), // Mon
            at('2026-03-10T09:00:00'), // Tue
            at('2026-03-12T09:00:00')  // Thu
        ]
        const runs = computeConsistencyRuns(sessions, schedule, now)
        expect(runs).toHaveLength(1)
        expect(runs[0]).toMatchObject({ start: '2026-03-09', end: '2026-03-12', days: 3, current: true })
    })

    it('splits runs at a missed scheduled workday', () => {
        const schedule = { monday: [{}], tuesday: [{}], wednesday: [{}], thursday: [{}], friday: [{}] }
        const now = new Date('2026-03-13T12:00:00') // Friday
        const sessions = [
            at('2026-03-09T09:00:00'), // Mon
            at('2026-03-10T09:00:00'), // Tue
            at('2026-03-12T09:00:00')  // Thu — Wed was skipped
        ]
        const runs = computeConsistencyRuns(sessions, schedule, now)
        expect(runs).toHaveLength(2)
        expect(runs[0]).toMatchObject({ start: '2026-03-09', end: '2026-03-10', days: 2 })
        expect(runs[0].current).toBeUndefined()
        expect(runs[1]).toMatchObject({ start: '2026-03-12', end: '2026-03-12', days: 1, current: true })
    })

    it('splits strictly consecutive runs when no schedule is set', () => {
        const now = new Date('2026-03-11T12:00:00') // Wednesday
        const sessions = [at('2026-03-08T09:00:00'), at('2026-03-09T09:00:00'), at('2026-03-11T09:00:00')]
        const runs = computeConsistencyRuns(sessions, {}, now)
        expect(runs).toHaveLength(2)
        expect(runs[0]).toMatchObject({ start: '2026-03-08', end: '2026-03-09', days: 2 })
        expect(runs[0].current).toBeUndefined()
        expect(runs[1]).toMatchObject({ start: '2026-03-11', end: '2026-03-11', days: 1, current: true })
    })

    it('returns no runs for an empty history', () => {
        expect(computeConsistencyRuns([], {}, new Date('2026-03-11T12:00:00'))).toEqual([])
    })
})
