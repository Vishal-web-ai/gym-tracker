function createFakeDir() {
    const entries = new Map()

    return {
        kind: 'directory',
        entries() {
            const items = [...entries]
            return (async function* () {
                for (const [name, handle] of items) yield [name, handle]
            })()
        },
        async getDirectoryHandle(name, { create = false } = {}) {
            let handle = entries.get(name)
            if (!handle) {
                if (!create) throw new Error(`directory not found: ${name}`)
                handle = createFakeDir()
                entries.set(name, handle)
            }
            if (handle.kind !== 'directory') throw new Error(`not a directory: ${name}`)
            return handle
        },
        async getFileHandle(name, { create = false } = {}) {
            let handle = entries.get(name)
            if (!handle) {
                if (!create) throw new Error(`file not found: ${name}`)
                handle = createFakeFile()
                entries.set(name, handle)
            }
            if (handle.kind !== 'file') throw new Error(`not a file: ${name}`)
            return handle
        },
        async removeEntry(name) {
            entries.delete(name)
        }
    }
}

function createFakeFile() {
    let bytes = new Uint8Array()

    return {
        kind: 'file',
        async createWritable() {
            let closed = false
            return {
                async write(chunk) {
                    if (closed) throw new Error('writable is closed')
                    if (typeof chunk === 'string') chunk = new TextEncoder().encode(chunk)
                    if (chunk instanceof Blob) chunk = new Uint8Array(await chunk.arrayBuffer())
                    if (chunk instanceof ArrayBuffer) chunk = new Uint8Array(chunk)
                    if (chunk instanceof Uint8Array) {
                        bytes = chunk
                        return
                    }
                    if (Array.isArray(chunk)) {
                        bytes = new Uint8Array(chunk)
                        return
                    }
                    throw new Error('unsupported chunk type')
                },
                async close() {
                    closed = true
                }
            }
        },
        async getFile() {
            return new Blob([bytes.slice()])
        }
    }
}

export function createFakeOPFS() {
    const root = createFakeDir()
    return {
        root,
        storage: {
            async getDirectory() {
                return root
            },
            async estimate() {
                return { usage: 0, quota: 1024 * 1024 }
            }
        }
    }
}

export function createFakeNavigator(opfs) {
    return { storage: opfs.storage }
}
