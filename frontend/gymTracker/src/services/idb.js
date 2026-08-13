const DB_NAME = 'gym-tracker'
const DB_VERSION = 2

const STORE_OPTIONS = {
    sessions: { keyPath: 'id' },
    exercises: { keyPath: 'id' },
    media: { keyPath: 'id' },
    meta: { keyPath: 'key' }
}

let dbPromise = null

function createStore(db, name) {
    if (!db.objectStoreNames.contains(name)) {
        db.createObjectStore(name, STORE_OPTIONS[name] || { keyPath: 'id' })
    }
}

// Each migration step runs in order, once per oldVersion gap.
// Never delete records here: migrations must only add or reshape, never drop data.
// Indexes must be created on the versionchange transaction (`tx`), not a fresh
// one — calling db.transaction() during upgradeneeded throws InvalidStateError.
function migrate(db, oldVersion, tx) {
    if (oldVersion < 1) {
        for (const name of Object.keys(STORE_OPTIONS)) {
            createStore(db, name)
        }
    }
    if (oldVersion < 2) {
        const store = tx.objectStore('media')
        if (!store.indexNames.contains('by-created')) {
            store.createIndex('by-created', ['createdAt', 'id'])
        }
    }
}

function openDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION)
        req.onupgradeneeded = (event) => {
            migrate(req.result, event.oldVersion, event.target.transaction)
        }
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
        req.onblocked = () => {
            // Another tab holds the database open at an old version. The
            // upgrade cannot start until that tab is closed. Surface it.
            reject(new Error('Database upgrade is blocked by another open tab. Close other Gym Tracker tabs and try again.'))
        }
    })
}

function getDB() {
    if (!dbPromise) dbPromise = openDB()
    return dbPromise
}

function run(store, mode, fn) {
    return getDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(store, mode)
        let out
        try {
            out = fn(tx.objectStore(store))
        } catch (err) {
            reject(err)
            return
        }
        tx.oncomplete = () => resolve(out)
        tx.onerror = () => reject(tx.error || new Error('Database error'))
        tx.onabort = () => reject(tx.error || new Error('Database transaction aborted'))
    }))
}

export async function dbGetAll(store) {
    const out = await run(store, 'readonly', s => s.getAll())
    return out.result
}

export async function dbGet(store, key) {
    const out = await run(store, 'readonly', s => s.get(key))
    return out.result
}

export async function dbPut(store, value) {
    await run(store, 'readwrite', s => s.put(value))
}

export async function dbDelete(store, key) {
    await run(store, 'readwrite', s => s.delete(key))
}

export async function dbClear(store) {
    await run(store, 'readwrite', s => s.clear())
}

// Closes the cached connection and drops the singleton so the next call
// reopens the database. Useful for tests and for reconnecting after an error.
export async function dbClose() {
    const db = dbPromise
    dbPromise = null
    if (db) {
        try {
            const opened = await db
            opened.close()
        } catch {
            // ignore a previously failed open
        }
    }
}

export async function dbBulkPut(store, values) {
    await run(store, 'readwrite', s => {
        for (const value of values) s.put(value)
    })
}

// Keyset (cursor-based) pagination over a composite index.
// `after` is { createdAt, id } (the last item of the previous page, exclusive).
// Returns at most `limit` records sorted by [createdAt, id] descending.
export async function dbGetPage(store, indexName, limit, after, type) {
    const db = await getDB()
    return new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readonly')
        const index = tx.objectStore(store).index(indexName)
        const items = []
        const req = after
            ? index.openCursor(IDBKeyRange.upperBound([after.createdAt, after.id], true), 'prev')
            : index.openCursor(null, 'prev')
        req.onsuccess = () => {
            const cursor = req.result
            if (cursor && items.length < limit) {
                if (type && cursor.value.type !== type) {
                    cursor.continue()
                } else {
                    items.push(cursor.value)
                    cursor.continue()
                }
            } else {
                resolve(items)
            }
        }
        req.onerror = () => reject(req.error || new Error('Database error'))
    })
}
