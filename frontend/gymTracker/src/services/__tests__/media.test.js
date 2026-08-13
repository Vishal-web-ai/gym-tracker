import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
    addMedia,
    getMedia,
    deleteMedia,
    readMediaFile,
    writeMediaFile,
    listMediaFiles,
    cleanupOrphans
} from '../media'
import { dbBulkPut } from '../idb'
import { resetDb } from '../../test/resetDb'
import { installOPFS, installThumbnailDOM } from '../../test/dom'

beforeEach(async () => {
    vi.unstubAllGlobals()
    await resetDb()
    installOPFS()
    installThumbnailDOM()
})

const videoBytes = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7])

const toBytes = async (blob) => new Uint8Array(await blob.arrayBuffer())

describe('media', () => {
    it('adds a video, writes the file, and generates a thumbnail', async () => {
        const file = new File([videoBytes], 'clip.mp4', { type: 'video/mp4' })
        const meta = await addMedia({ file })

        expect(meta.type).toBe('video')
        expect(meta.fileName).toBe('clip.mp4')
        expect(meta.thumb.startsWith('data:image/jpeg')).toBe(true)

        const stored = await toBytes(await readMediaFile(meta.id))
        expect(stored).toEqual(videoBytes)

        const list = await getMedia()
        expect(list).toHaveLength(1)
        expect(list[0].id).toBe(meta.id)
    })

    it('adds an image', async () => {
        const file = new File([videoBytes], 'photo.png', { type: 'image/png' })
        const meta = await addMedia({ file })
        expect(meta.type).toBe('image')
    })

    it('rejects files that are not images or videos', async () => {
        const file = new File([videoBytes], 'notes.txt', { type: 'application/pdf' })
        await expect(addMedia({ file })).rejects.toThrow(/Unsupported file type/)
    })

    it('rejects files that exceed the storage quota and leaves nothing behind', async () => {
        const big = new File([new Uint8Array(2 * 1024 * 1024)], 'big.mp4', { type: 'video/mp4' })
        await expect(addMedia({ file: big })).rejects.toMatchObject({ name: 'QuotaExceededError' })
        expect(await listMediaFiles()).toEqual([])
    })

    it('deletes the file and its metadata', async () => {
        const meta = await addMedia({ file: new File([videoBytes], 'a.mp4', { type: 'video/mp4' }) })
        await deleteMedia(meta.id)
        expect(await getMedia()).toEqual([])
        expect(await listMediaFiles()).toEqual([])
    })

    it('removes orphaned files that have no metadata', async () => {
        await writeMediaFile('kept', new Blob([videoBytes]))
        await writeMediaFile('orphan', new Blob([videoBytes]))
        await dbBulkPut('media', [{ id: 'kept', type: 'video', mime: 'video/mp4', createdAt: '2026-01-01T00:00:00Z' }])

        const removed = await cleanupOrphans()
        expect(removed).toBe(1)
        expect(await listMediaFiles()).toEqual(['kept'])
    })

    it('round-trips a file through a temp name when move is unsupported', async () => {
        await writeMediaFile('m1', new Blob([videoBytes]))
        expect(await listMediaFiles()).toEqual(['m1'])
        const stored = await toBytes(await readMediaFile('m1'))
        expect(stored).toEqual(videoBytes)
    })
})
