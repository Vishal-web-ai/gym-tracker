import { describe, it, expect, beforeEach } from 'vitest'
import { dbGetAll, dbPut, dbGet, dbDelete, dbGetPage } from '../idb'
import { resetDb } from '../../test/resetDb'

beforeEach(resetDb)

describe('indexeddb', () => {
    it('persists and reads records', async () => {
        await dbPut('sessions', { id: 's1', name: 'Chest Day', createdAt: '2026-01-01T00:00:00Z' })
        const all = await dbGetAll('sessions')
        expect(all).toHaveLength(1)
        expect(all[0].name).toBe('Chest Day')
    })

    it('deletes records', async () => {
        await dbPut('sessions', { id: 's1' })
        await dbDelete('sessions', 's1')
        expect(await dbGet('sessions', 's1')).toBeUndefined()
    })

    it('migrates a v1 database without losing data', async () => {
        await new Promise((resolve, reject) => {
            const req = indexedDB.open('gym-tracker', 1)
            req.onupgradeneeded = () => {
                const db = req.result
                db.createObjectStore('sessions', { keyPath: 'id' })
                db.createObjectStore('exercises', { keyPath: 'id' })
                db.createObjectStore('media', { keyPath: 'id' })
                db.createObjectStore('meta', { keyPath: 'key' })
            }
            req.onsuccess = () => {
                const db = req.result
                const tx = db.transaction('sessions', 'readwrite')
                tx.objectStore('sessions').put({ id: 'old1', name: 'Survivor', createdAt: '2026-01-01T00:00:00Z' })
                tx.oncomplete = () => {
                    db.close()
                    resolve()
                }
                tx.onerror = () => reject(tx.error)
            }
            req.onerror = () => reject(req.error)
        })

        const all = await dbGetAll('sessions')
        expect(all).toHaveLength(1)
        expect(all[0].id).toBe('old1')
    })

    it('paginates via the by-created index', async () => {
        for (let i = 0; i < 5; i++) {
            await dbPut('media', { id: `m${i + 1}`, createdAt: `2026-01-0${i + 1}T00:00:00Z` })
        }
        const page1 = await dbGetPage('media', 'by-created', 2, null)
        expect(page1.map(m => m.id)).toEqual(['m5', 'm4'])
        const page2 = await dbGetPage('media', 'by-created', 2, page1[page1.length - 1])
        expect(page2.map(m => m.id)).toEqual(['m3', 'm2'])
    })
})
