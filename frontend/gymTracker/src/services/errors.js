const QUOTA_PATTERNS = [/quota/i, /not enough space/i, /storage full/i]
const PERMISSION_PATTERNS = [/denied/i, /permission/i, /not allowed/i]
const NOT_FOUND_PATTERNS = [/not found/i, /no longer exist/i]
const INVALID_BACKUP_PATTERNS = [/not a gym tracker backup/i, /invalid backup/i, /newer version/i, /missing backup/i]

// Classifies browser/storage errors into a small set of stable error objects
// so the UI can show understandable messages instead of raw internals.
export function classifyError(err) {
    const message = err?.message || err?.name || ''
    const name = err?.name || ''

    if (name === 'QuotaExceededError' || QUOTA_PATTERNS.some(p => p.test(message))) {
        return { kind: 'quota', message: 'Not enough storage space on this device. Free up space and try again.' }
    }
    if (name === 'NotAllowedError' || name === 'SecurityError' || PERMISSION_PATTERNS.some(p => p.test(message))) {
        return { kind: 'permission', message: 'Storage permission was denied by this browser.' }
    }
    if (name === 'NotFoundError' || NOT_FOUND_PATTERNS.some(p => p.test(message))) {
        return { kind: 'not-found', message: 'The file or record was not found. It may have been removed.' }
    }
    if (name === 'InvalidStateError' || /transaction|database|upgrade|blocked/i.test(message)) {
        return { kind: 'database', message: 'The local database is not available right now. Close other Gym Tracker tabs and try again.' }
    }
    if (INVALID_BACKUP_PATTERNS.some(p => p.test(message))) {
        return { kind: 'invalid-backup', message }
    }
    if (name === 'AbortError') {
        return { kind: 'cancelled', message: 'Operation was cancelled.' }
    }
    return { kind: 'unknown', message: message || 'Something went wrong. Please try again.' }
}

export function getErrorMessage(err) {
    return classifyError(err).message
}
