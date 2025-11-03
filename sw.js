const CACHE_NAME = 'munetios-cache-v1';
const URLS_TO_CACHE = [
    '/search/search.html',
    '/favicon.ico',
    '/favicon-16x16.png',
    '/favicon-32x32.png',
    'Munetios-Logo.png',
    '/manifest.json',
    '/index.html',
    '/'
];

// Install: cache files
self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(URLS_TO_CACHE))
    );
});

// Activate: clean old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

// Fetch: network first, fallback to cache, update cache in background
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Clone and update cache
                const resClone = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, resClone));
                return response;
            })
            .catch(() =>
                caches.match(event.request).then(cached => cached || offlineFallback())
            )
    );
});

// Offline fallback for navigation requests
// Offline fallback for navigation requests
function offlineFallback() {
    return caches.match('/index.html');
}
