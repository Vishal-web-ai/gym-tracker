import { describe, it, expect, beforeEach, vi } from 'vitest'
import { strToU8, zipSync, unzipSync } from 'fflate'
import { exportBackup, importBackup } from '../backup'
import { dbGetAll, dbBulkPut, dbPut } from '../idb'
import { readMediaFile, writeMediaFile } from '../media'
import { resetDb } from '../../test/resetDb'
import { installOPFS, installThumbnailDOM, captureDownloads } from '../../test/dom'

beforeEach(async () => {
    vi.unstubAllGlobals()
    await resetDb()
    installOPFS()
    installThumbnailDOM()
})

const pngBytes = new Uint8Array([1, 2, 3, 4, 5])

const toBytes = async (blob) => new Uint8Array(await blob.arrayBuffer())

async function zipBlob(entries) {
    return new Blob([zipSync(Object.fromEntries(
        Object.entries(entries).map(([name, bytes]) => [name, typeof bytes === 'string' ? strToU8(bytes) : bytes])
    ))], { type: 'application/zip' })
}

describe('backup export', () => {
    it('exports a zip containing the manifest and media', async () => {
        await dbPut('sessions', { id: 's1', name: 'Chest', createdAt: '2026-01-01T00:00:00Z' })
        await dbPut('meta', { key: 'name', value: 'Tester' })
        await dbBulkPut('media', [{ id: 'm1', fileName: 'photo.png', type: 'image', mime: 'image/png', size: 5, createdAt: '2026-01-01T00:00:00Z' }])
        await writeMediaFile('m1', new Blob([pngBytes], { type: 'image/png' }))

        const captured = captureDownloads()
        const filename = await exportBackup()
        expect(filename).toMatch(/^GymTracker-Backup-\d{4}-\d{2}-\d{2}\.zip$/)
        expect(captured).toHaveLength(1)

        const entries = unzipSync(new Uint8Array(await captured[0].arrayBuffer()))
        const manifest = JSON.parse(new TextDecoder().decode(entries['backup.json']))
        expect(manifest.app).toBe('gym-tracker')
        expect(manifest.backupVersion).toBe(2)
        expect(manifest.name).toBe('Tester')
        expect(manifest.sessions).toHaveLength(1)
        expect(manifest.media[0].file).toBe('media/m1.png')
        expect(new Uint8Array(entries['media/m1.png'])).toEqual(pngBytes)
    })

    it('skips media files that are missing from disk', async () => {
        await dbBulkPut('media', [
            { id: 'm1', fileName: 'a.png', type: 'image', mime: 'image/png', createdAt: '2026-01-01T00:00:00Z' },
            { id: 'm2', fileName: 'b.png', type: 'image', mime: 'image/png', createdAt: '2026-01-02T00:00:00Z' }
        ])
        await writeMediaFile('m1', new Blob([pngBytes]))

        const captured = captureDownloads()
        await exportBackup()

        const entries = unzipSync(new Uint8Array(await captured[0].arrayBuffer()))
        expect(entries['media/m1.png']).toBeTruthy()
        expect(Object.keys(entries).some(name => name.startsWith('media/m2'))).toBe(false)
    })
})

describe('backup import', () => {
    it('restores data and media files from a zip', async () => {
        const manifest = {
            app: 'gym-tracker',
            backupVersion: 2,
            appVersion: '0.0.0',
            createdAt: '2026-01-01T00:00:00Z',
            name: 'Imported',
            sessions: [{ id: 's1', name: 'Legs', createdAt: '2026-01-01T00:00:00Z' }],
            exercises: [{ id: 'e1', name: 'Squat', category: 'Legs', createdAt: '2026-01-01T00:00:00Z' }],
            media: [{ id: 'm1', fileName: 'vid.mp4', type: 'video', mime: 'video/mp4', file: 'media/m1.mp4', createdAt: '2026-01-01T00:00:00Z' }]
        }
        const file = await zipBlob({
            'backup.json': JSON.stringify(manifest),
            'media/m1.mp4': new Uint8Array([9, 8, 7])
        })

        const result = await importBackup(file)
        expect(result.skippedMedia).toBe(0)

        expect((await dbGetAll('sessions'))[0].name).toBe('Legs')
        expect((await dbGetAll('exercises'))[0].name).toBe('Squat')
        const media = await dbGetAll('media')
        expect(media).toHaveLength(1)
        expect(media[0].id).toBe('m1')
        const stored = await toBytes(await readMediaFile('m1'))
        expect(stored).toEqual(new Uint8Array([9, 8, 7]))
    })

    it('counts media referenced in the manifest but absent from the archive', async () => {
        const manifest = {
            app: 'gym-tracker',
            backupVersion: 2,
            media: [
                { id: 'm1', mime: 'image/png', file: 'media/m1.png' },
                { id: 'm2', mime: 'image/png', file: 'media/m2.png' }
            ]
        }
        const file = await zipBlob({
            'backup.json': JSON.stringify(manifest),
            'media/m1.png': new Uint8Array([1])
        })

        const result = await importBackup(file)
        expect(result.skippedMedia).toBe(1)
        expect((await dbGetAll('media')).map(m => m.id)).toEqual(['m1'])
    })

    it('imports a legacy v1 JSON backup with base64 media', async () => {
        const dataURL = `data:image/png;base64,${btoa(String.fromCharCode(...pngBytes))}`
        const payload = {
            app: 'gym-tracker',
            appVersion: '0.1.0',
            exportedAt: '2026-01-01T00:00:00Z',
            name: 'Legacy',
            sessions: [{ id: 's1', name: 'Old', createdAt: '2026-01-01T00:00:00Z' }],
            exercises: [],
            media: [{ id: 'm1', mime: 'image/png' }],
            files: { m1: { data: dataURL } }
        }

        const result = await importBackup(new Blob([strToU8(JSON.stringify(payload))]))
        expect(result.skippedMedia).toBe(0)
        const stored = await toBytes(await readMediaFile('m1'))
        expect(stored).toEqual(pngBytes)
    })

    it('rejects files that are not backups', async () => {
        await expect(importBackup(new Blob([new Uint8Array([1, 2, 3, 4, 5, 6, 7])]))).rejects.toThrow(/Invalid backup|corrupted|not a Gym Tracker/i)
    })

    it('rejects valid JSON that is not a gym-tracker backup', async () => {
        const file = await zipBlob({ 'backup.json': JSON.stringify({ app: 'other' }) })
        await expect(importBackup(file)).rejects.toThrow('Not a Gym Tracker backup file')
    })

    it('rejects backups from a newer app version', async () => {
        const file = await zipBlob({ 'backup.json': JSON.stringify({ app: 'gym-tracker', backupVersion: 99 }) })
        await expect(importBackup(file)).rejects.toThrow(/newer version/)
    })
})
