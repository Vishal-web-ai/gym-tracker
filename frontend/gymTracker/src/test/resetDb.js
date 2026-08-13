import { dbClose } from '../services/idb'

export async function resetDb() {
    await dbClose().catch(() => {})
    await new Promise((resolve, reject) => {
        const req = indexedDB.deleteDatabase('gym-tracker')
        req.onsuccess = () => resolve()
        req.onerror = () => reject(req.error)
        req.onblocked = () => reject(new Error('database delete blocked'))
    })
}
