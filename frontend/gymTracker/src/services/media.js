import { dbGetAll, dbPut, dbDelete, dbGetPage } from './idb'
import { getDeviceTier } from './device'

const DIR = 'media'

async function mediaDir(create = true) {
    const root = await navigator.storage.getDirectory()
    return root.getDirectoryHandle(DIR, { create })
}

export async function removeMediaFile(id) {
    const dir = await mediaDir(false)
    await dir.removeEntry(id)
}

// Writes a file to the media directory. Writes to a temp name first and then
// renames, so an interrupted write never leaves a half-written file under the
// real id.
export async function writeMediaFile(id, blob) {
    const dir = await mediaDir()
    const tmp = `${id}.tmp`
    try {
        await dir.removeEntry(tmp)
    } catch {
        // no stale temp file
    }
    const tempHandle = await dir.getFileHandle(tmp, { create: true })
    const writable = await tempHandle.createWritable()
    await writable.write(blob)
    await writable.close()

    if (typeof tempHandle.move === 'function') {
        try {
            await dir.removeEntry(id).catch(() => {})
            await tempHandle.move(id)
            return
        } catch {
            // move unsupported or failed; fall through to copy
        }
    }
    const finalHandle = await dir.getFileHandle(id, { create: true })
    const finalWritable = await finalHandle.createWritable()
    const file = await tempHandle.getFile()
    await finalWritable.write(file)
    await finalWritable.close()
    await dir.removeEntry(tmp).catch(() => {})
}

export async function readMediaFile(id) {
    const dir = await mediaDir(false)
    const handle = await dir.getFileHandle(id)
    return handle.getFile()
}

export async function listMediaFiles() {
    let dir
    try {
        dir = await mediaDir(false)
    } catch {
        return []
    }
    const names = []
    for await (const [name] of dir.entries()) {
        names.push(name)
    }
    return names
}

export async function getMedia() {
    const list = await dbGetAll('media')
    return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
}

export async function getMediaPage(limit, after, type) {
    return dbGetPage('media', 'by-created', limit, after || null, type || null)
}

async function checkQuota(bytes) {
    if (!navigator.storage?.estimate) return
    const { usage = 0, quota = 0 } = await navigator.storage.estimate()
    if (quota > 0 && usage + bytes > quota) {
        const err = new Error('Not enough storage space on this device.')
        err.name = 'QuotaExceededError'
        throw err
    }
}

export async function addMedia({ file }) {
    if (!file.type?.startsWith('image/') && !file.type?.startsWith('video/')) {
        throw new Error('Unsupported file type. Please choose an image or video.')
    }
    await checkQuota(file.size)

    const id = crypto.randomUUID()
    const isVideo = file.type.startsWith('video')
    const meta = {
        id,
        fileName: file.name || `memory-${id}`,
        type: isVideo ? 'video' : 'image',
        mime: file.type,
        size: file.size,
        thumb: await makeThumbnail(file),
        createdAt: new Date().toISOString()
    }

    try {
        await writeMediaFile(id, file)
        await dbPut('media', meta)
    } catch (err) {
        // Never leave an orphaned OPFS file behind a failed upload.
        try {
            await removeMediaFile(id)
        } catch {
            // best effort
        }
        throw err
    }
    return meta
}

export async function deleteMedia(id) {
    try {
        await removeMediaFile(id)
    } catch (err) {
        if (err?.name !== 'NotFoundError') throw err
    }
    await dbDelete('media', id)
    return true
}

// Removes OPFS files that have no matching metadata record. Returns the number
// of orphans cleaned up. Safe to run any time.
export async function cleanupOrphans() {
    const ids = new Set((await dbGetAll('media')).map(m => m.id))
    let removed = 0
    for (const name of await listMediaFiles()) {
        if (!ids.has(name)) {
            try {
                await removeMediaFile(name)
                removed++
            } catch {
                // best effort
            }
        }
    }
    return removed
}

function makeThumbnail(file) {
    const max = getDeviceTier().lite ? 320 : 600
    return new Promise((resolve) => {
        const url = URL.createObjectURL(file)
        if (file.type.startsWith('video')) {
            const video = document.createElement('video')
            video.muted = true
            video.playsInline = true
            video.preload = 'metadata'
            video.src = url
            video.onloadedmetadata = () => {
                video.currentTime = Math.min(1, (video.duration || 0) / 2)
            }
            video.onseeked = () => {
                resolve(drawThumb(video, max))
                URL.revokeObjectURL(url)
            }
            video.onerror = () => {
                URL.revokeObjectURL(url)
                resolve('')
            }
        } else {
            const img = new Image()
            img.onload = () => {
                resolve(drawThumb(img, max))
                URL.revokeObjectURL(url)
            }
            img.onerror = () => {
                URL.revokeObjectURL(url)
                resolve('')
            }
            img.src = url
        }
    })
}

function drawThumb(source, max) {
    const w = source.videoWidth || source.naturalWidth
    const h = source.videoHeight || source.naturalHeight
    if (!w || !h) return ''
    const scale = Math.min(1, max / w)
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(w * scale)
    canvas.height = Math.round(h * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) return ''
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
    try {
        return canvas.toDataURL('image/jpeg', 0.7)
    } catch {
        return ''
    }
}
