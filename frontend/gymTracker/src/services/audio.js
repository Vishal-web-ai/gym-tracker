let audioCtx = null

export const ensureCtx = () => {
    if (!audioCtx) {
        const Ctx = window.AudioContext || window.webkitAudioContext
        audioCtx = new Ctx()
    }
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {})
    return audioCtx
}

export const playBeep = () => {
    try {
        const ctx = ensureCtx()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.value = 880
        gain.gain.setValueAtTime(0.001, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
        osc.connect(gain).connect(ctx.destination)
        osc.start()
        osc.stop(ctx.currentTime + 0.62)
    } catch {
        // audio unavailable
    }
}
