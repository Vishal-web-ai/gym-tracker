import { Zip, ZipPassThrough, strToU8, strFromU8, unzipSync } from 'fflate'
import pkg from '../../package.json'
import { dbGetAll, dbPut, dbClear, dbBulkPut } from './idb'
import { readMediaFile, writeMediaFile, listMediaFiles, removeMediaFile } from './media'
import { getErrorMessage } from './errors'

export const BACKUP_VERSION = 2
export const APP_VERSION = pkg.version

const EXT_BY_MIME = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/heic': 'heic',
    'image/heif': 'heif',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov'
}

function extFromMime(mime) {
    const ext = EXT_BY_MIME[mime] || (mime && mime.split('/')[1]) || 'bin'
    return ext.replace(/[^a-z0-9]/gi, '') || 'bin'
}

function mediaEntryName(item) {
    return `media/${item.id}.${extFromMime(item.mime)}`
}

function dateStamp() {
    return new Date().toISOString().slice(0, 10)
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

// Streams media files into a ZIP one at a time (never all at once). When the
// browser supports the File System Access API, output is streamed straight to
// disk; otherwise the ZIP is assembled in memory and downloaded as a Blob.
export async function exportBackup({ onProgress } = {}) {
    const [sessions, exercises, media, metaRows] = await Promise.all([
        dbGetAll('sessions'),
        dbGetAll('exercises'),
        dbGetAll('media'),
        dbGetAll('meta')
    ])
    const name = metaRows.find(r => r.key === 'name')?.value || 'Vishal'

    const manifest = {
        app: 'gym-tracker',
        backupVersion: BACKUP_VERSION,
        appVersion: APP_VERSION,
        createdAt: new Date().toISOString(),
        name,
        sessions,
        exercises,
        media: media.map(item => ({ ...item, file: mediaEntryName(item) }))
    }

    const filename = `GymTracker-Backup-${dateStamp()}.zip`

    let writable = null
    if (typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function') {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: filename,
                types: [{ description: 'ZIP archive', accept: { 'application/zip': ['.zip'] } }]
            })
            writable = await handle.createWritable()
        } catch {
            writable = null // cancelled or unsupported; fall back to download
        }
    }
    const chunks = writable ? null : []

    let chain = Promise.resolve()
    const zip = new Zip((err, dat) => {
        if (err) throw err
        if (!dat) return
        if (writable) {
            chain = chain.then(() => writable.write(dat))
        } else {
            chunks.push(dat)
        }
    })

    const total = media.length + 1
    let done = 0
    const report = (label) => {
        done += 1
        onProgress?.({ current: done, total, label })
    }

    try {
        report('Preparing backup...')
        const jsonEntry = new ZipPassThrough('backup.json')
        zip.add(jsonEntry)
        jsonEntry.push(strToU8(JSON.stringify(manifest)), true)

        for (const item of manifest.media) {
            report(item.fileName || item.id)
            let file
            try {
                file = await readMediaFile(item.id)
            } catch {
                continue // file missing: skip it, keep going
            }
            const entry = new ZipPassThrough(item.file)
            zip.add(entry)
            const reader = file.stream().getReader()
            for (;;) {
                const { done: eof, value } = await reader.read()
                if (eof) break
                entry.push(value instanceof Uint8Array ? value : new Uint8Array(value), false)
            }
            entry.push(new Uint8Array(), true)
        }
        zip.end()
        await chain
    } catch (err) {
        throw new Error(`Backup failed: ${getErrorMessage(err)}`, { cause: err })
    }

    if (writable) {
        await writable.close()
    } else {
        const blob = new Blob(chunks, { type: 'application/zip' })
        downloadBlob(blob, filename)
    }
    return filename
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

export async function importBackup(file, { onProgress } = {}) {
    let bytes
    try {
        bytes = new Uint8Array(await file.arrayBuffer())
    } catch {
        throw new Error('Could not read the selected file.')
    }

    const { manifest, files } = parseBackup(bytes)
    validateManifest(manifest)

    const snapshot = {
        sessions: await dbGetAll('sessions'),
        exercises: await dbGetAll('exercises'),
        media: await dbGetAll('media'),
        meta: await dbGetAll('meta')
    }
    const oldFiles = new Set(await listMediaFiles())

    // Keep only media entries that actually have a file in the backup.
    const mediaItems = (manifest.media || []).filter(item => files[item.id])
    const skippedMedia = (manifest.media || []).length - mediaItems.length

    const total = mediaItems.length + 1
    let done = 1
    const report = (label) => {
        done += 1
        onProgress?.({ current: done, total, label })
    }

    try {
        for (const item of mediaItems) {
            report(item.fileName || item.id)
            await writeMediaFile(item.id, new Blob([files[item.id]], { type: item.mime || 'application/octet-stream' }))
        }
    } catch (err) {
        cleanupNewFiles(mediaItems, oldFiles)
        throw new Error(`Failed to restore media files: ${getErrorMessage(err)}`, { cause: err })
    }

    try {
        await dbClear('sessions')
        await dbClear('exercises')
        await dbClear('media')
        await dbClear('meta')
        await dbBulkPut('sessions', manifest.sessions || [])
        await dbBulkPut('exercises', manifest.exercises || [])
        await dbBulkPut('media', mediaItems)
        await dbPut('meta', { key: 'name', value: manifest.name || 'Vishal' })
    } catch (err) {
        await rollbackIdb(snapshot)
        cleanupNewFiles(mediaItems, oldFiles)
        throw new Error(`Failed to restore database: ${getErrorMessage(err)}`, { cause: err })
    }

    // Remove stale files that are no longer referenced by the restored data.
    const newIds = new Set(mediaItems.map(m => m.id))
    for (const name of oldFiles) {
        if (!newIds.has(name)) {
            try {
                await removeMediaFile(name)
            } catch {
                // best effort
            }
        }
    }

    return { skippedMedia }
}

async function cleanupNewFiles(mediaItems, oldFiles) {
    for (const item of mediaItems) {
        if (!oldFiles.has(item.id)) {
            try {
                await removeMediaFile(item.id)
            } catch {
                // best effort
            }
        }
    }
}

async function rollbackIdb(snapshot) {
    try {
        await dbClear('sessions')
        await dbClear('exercises')
        await dbClear('media')
        await dbClear('meta')
        await dbBulkPut('sessions', snapshot.sessions)
        await dbBulkPut('exercises', snapshot.exercises)
        await dbBulkPut('media', snapshot.media)
        await dbBulkPut('meta', snapshot.meta)
    } catch {
        // snapshot restore is best-effort
    }
}

// ---------------------------------------------------------------------------
// Parsing & validation
// ---------------------------------------------------------------------------

function parseBackup(bytes) {
    const isZip = bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4b
    if (isZip) {
        let entries
        try {
            entries = unzipSync(bytes)
        } catch {
            throw new Error('Invalid backup: the file is corrupted or not a valid ZIP archive.')
        }
        const manifestBytes = entries['backup.json']
        if (!manifestBytes) {
            throw new Error('Invalid backup: missing backup.json')
        }
        let manifest
        try {
            manifest = JSON.parse(strFromU8(manifestBytes))
        } catch {
            throw new Error('Invalid backup: the backup manifest is corrupted.')
        }
        const files = {}
        for (const item of manifest.media || []) {
            if (item.file && entries[item.file]) {
                files[item.id] = entries[item.file]
            }
        }
        return { manifest, files }
    }

    // Legacy JSON backup (backupVersion 1) with base64-embedded media.
    let payload
    try {
        payload = JSON.parse(strFromU8(bytes))
    } catch {
        throw new Error('Invalid backup: the file is corrupted or not a Gym Tracker backup.')
    }
    if (payload?.app !== 'gym-tracker') {
        throw new Error('Not a Gym Tracker backup file')
    }
    const files = {}
    for (const [id, entry] of Object.entries(payload.files || {})) {
        if (entry?.data) files[id] = dataURLToBytes(entry.data)
    }
    return {
        manifest: {
            app: 'gym-tracker',
            backupVersion: 1,
            appVersion: payload.appVersion,
            createdAt: payload.exportedAt,
            name: payload.name,
            sessions: payload.sessions || [],
            exercises: payload.exercises || [],
            media: payload.media || []
        },
        files
    }
}

function validateManifest(manifest) {
    if (manifest?.app !== 'gym-tracker') {
        throw new Error('Not a Gym Tracker backup file')
    }
    const version = manifest.backupVersion ?? manifest.version
    if (typeof version !== 'number') {
        throw new Error('Invalid backup: missing or invalid version.')
    }
    if (version > BACKUP_VERSION) {
        throw new Error('This backup was created by a newer version of the app and cannot be restored here.')
    }
    if (version < 1) {
        throw new Error('Invalid backup: unsupported version.')
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function dataURLToBytes(dataURL) {
    const data = dataURL.split(',')[1]
    const bin = atob(data)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return bytes
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
}
