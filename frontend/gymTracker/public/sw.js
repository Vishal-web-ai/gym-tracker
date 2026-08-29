const CACHE = 'gym-tracker-v8'
const IS_DEV = ['localhost', '127.0.0.1'].includes(self.location.hostname)
const PRECACHE = [
    '/',
    '/index.html',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png',
    '/favicon.png',
    '/logo.png'
]

const FONT_ORIGINS = ['https://fonts.googleapis.com', 'https://fonts.gstatic.com']

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE)
            .then(cache => cache.addAll(PRECACHE))
            .then(() => self.skipWaiting())
    )
})

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(key => key !== CACHE).map(key => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    )
})

self.addEventListener('fetch', (event) => {
    const { request } = event
    if (request.method !== 'GET') return

    // Never intercept localhost: the dev server must always serve fresh modules,
    // otherwise cache-first would hand out stale builds after every code change.
    if (IS_DEV) return

    const url = new URL(request.url)
    const isFont = FONT_ORIGINS.includes(url.origin)

    // Cross-origin (fonts) and same-origin asset requests: cache-first with
    // runtime fill, so the first successful load populates the cache.
    if (isFont || url.origin === self.location.origin) {
        if (request.mode === 'navigate') {
            // Network-first for navigation so updates to index.html propagate;
            // fall back to the cached shell when offline.
            event.respondWith(
                fetch(request)
                    .then(response => {
                        const copy = response.clone()
                        caches.open(CACHE).then(cache => cache.put(request, copy))
                        return response
                    })
                    .catch(() => caches.match('/index.html'))
            )
            return
        }

        event.respondWith(
            caches.match(request).then(cached => {
                if (cached) return cached
                return fetch(request).then(response => {
                    if (response.ok) {
                        const copy = response.clone()
                        caches.open(CACHE).then(cache => cache.put(request, copy))
                    }
                    return response
                })
            })
        )
    }
    // Anything else (unexpected third-party requests) is passed through untouched.
})
