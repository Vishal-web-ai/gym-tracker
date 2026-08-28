// Lightweight-device detection. A device is treated as "lite" when it has low
// RAM (< 4 GB) or a weak/old CPU or GPU. Lite devices get a trimmed-down but
// visually-equivalent version of the app (fewer particles, no GSAP menu
// timeline, smaller thumbnails) so it stays smooth.

const WEAK_GPU_RE = /(swiftshader|llvmpipe|software)|(adreno\s*[0-2]\d\d|adreno\s*3\d\d)|(mali\s*-[2-5]00|mali\s*-[2-5]50)|(power\s*vr|gx\d{3})|(intel\s*hd\s*graphics?|intel\s*(u|h)hd\s*[0-6]\d\d)|(hd\s*graphics?)/i

let cached = null

export function getGpuInfo() {
    try {
        const canvas = document.createElement('canvas')
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
        if (!gl) return null
        const ext = gl.getExtension('WEBGL_debug_renderer_info')
        const renderer = ext && gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
        const vendor = gl.getParameter(gl.VENDOR)
        return { renderer, vendor }
    } catch {
        return null
    }
}

export function isWeakGpu(gpu = getGpuInfo()) {
    if (!gpu) return false
    const s = `${gpu.renderer || ''} ${gpu.vendor || ''}`
    return WEAK_GPU_RE.test(s)
}

// deviceMemory (GB). Undefined on many browsers/desktop.
function getRam() {
    if (typeof navigator === 'undefined') return null
    const m = navigator.deviceMemory
    return typeof m === 'number' && Number.isFinite(m) ? m : null
}

function getCores() {
    if (typeof navigator === 'undefined') return null
    const c = navigator.hardwareConcurrency
    return typeof c === 'number' && Number.isFinite(c) ? c : null
}

export function getDeviceTier() {
    if (cached) return cached
    const ram = getRam()
    const cores = getCores()
    const gpu = getGpuInfo()
    const reasons = []
    if (ram != null && ram <= 4) reasons.push('low-ram')
    if (cores != null && cores < 4) reasons.push('few-cores')
    if (isWeakGpu(gpu)) reasons.push('weak-gpu')
    const lite = reasons.length > 0
    cached = {
        lite,
        ram,
        cores,
        gpu: gpu?.renderer || null,
        reasons
    }
    return cached
}

export function isLiteDevice() {
    return getDeviceTier().lite
}
