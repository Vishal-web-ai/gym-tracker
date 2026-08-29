// Haptic feedback wrapper. Degrades silently where the Vibration API is
// unavailable (desktop, iOS Safari without vibration) or on heavy use.

import { playBeep } from './audio'

// Android requires a user gesture before navigator.vibrate works from async
// callbacks/timeouts. Unlock once on first interaction.
let gestureUnlocked = false
function unlockGesture() {
    if (gestureUnlocked) return
    gestureUnlocked = true
    try { navigator.vibrate?.(1) } catch { /* unsupported */ }
    document.removeEventListener('pointerdown', unlockGesture)
    document.removeEventListener('touchend', unlockGesture)
}
document.addEventListener('pointerdown', unlockGesture)
document.addEventListener('touchend', unlockGesture)

export const PATTERNS = {
    tap: 15,
    medium: [40, 40, 40],
    strong: [0, 120, 60],
    success: [0, 60, 60, 90],
    alert: [100, 60, 100]
}

function supported() {
    return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
}

export function vibrate(pattern) {
    if (supported()) {
        try {
            if (navigator.vibrate(pattern)) return true
        } catch { /* native vibration unavailable */ }
    }
    // iOS Safari: no Vibration API. Fall back to an audible beep so users
    // still get feedback on every vibe call.
    const len = Array.isArray(pattern) ? pattern.length : (pattern || 0)
    if (len > 0) playBeep()
    return false
}

// Short confirmatory buzz — good for finishing a set or saving.
export function buzz() {
    return vibrate(PATTERNS.tap)
}

// Medium double buzz — start/stop/restart of timers, level-ups.
export function buzzMed() {
    return vibrate(PATTERNS.medium)
}

// Stronger emphasis for big wins (rank up, level up, alarm done).
export function buzzStrong() {
    return vibrate(PATTERNS.strong)
}

export function buzzSuccess() {
    return vibrate(PATTERNS.success)
}

export function buzzAlert() {
    return vibrate(PATTERNS.alert)
}
