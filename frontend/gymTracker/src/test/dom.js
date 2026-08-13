import { vi } from 'vitest'
import { createFakeOPFS } from './fakeOpfs'

export function installOPFS() {
    const opfs = createFakeOPFS()
    vi.stubGlobal('navigator', { storage: opfs.storage })
    return opfs
}

// A fake media element that simulates the load/seek flow:
// setting `src` schedules the load event; the video's `currentTime` setter
// fires `onseeked` on the next microtask.
function fakeMediaElement() {
    const el = {
        muted: false,
        playsInline: false,
        preload: '',
        duration: 10,
        videoWidth: 320,
        videoHeight: 240,
        naturalWidth: 320,
        naturalHeight: 240,
        onloadedmetadata: null,
        onseeked: null,
        onerror: null,
        onload: null,
        _src: '',
        _currentTime: 0
    }
    Object.defineProperty(el, 'src', {
        get() {
            return el._src
        },
        set(value) {
            el._src = value
            setTimeout(() => {
                if (el.onloadedmetadata) el.onloadedmetadata()
                else if (el.onload) el.onload()
            }, 0)
        }
    })
    Object.defineProperty(el, 'currentTime', {
        get() {
            return el._currentTime
        },
        set(value) {
            el._currentTime = value
            queueMicrotask(() => {
                if (el.onseeked) el.onseeked()
            })
        }
    })
    return el
}

export function installThumbnailDOM() {
    vi.stubGlobal('document', {
        createElement(tag) {
            if (tag === 'canvas') {
                return {
                    width: 0,
                    height: 0,
                    getContext() {
                        return { drawImage() {} }
                    },
                    toDataURL() {
                        return 'data:image/jpeg;base64,ZmFrZQ=='
                    }
                }
            }
            if (tag === 'video') return fakeMediaElement()
            return { href: '', download: '', click() {} }
        }
    })
    vi.stubGlobal('Image', function FakeImage() {
        return fakeMediaElement()
    })
    try {
        URL.createObjectURL = () => 'blob:test'
        URL.revokeObjectURL = () => {}
    } catch {
        // native implementation works fine
    }
}

// Overrides URL.createObjectURL so downloadBlob's ZIP is captured instead of
// being handed to a fake <a>. Returns the list of created Blobs.
export function captureDownloads() {
    const captured = []
    Object.defineProperty(URL, 'createObjectURL', {
        configurable: true,
        value: (blob) => {
            captured.push(blob)
            return `blob:test-${captured.length}`
        }
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
        configurable: true,
        value: () => {}
    })
    return captured
}
