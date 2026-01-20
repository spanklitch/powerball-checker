const CACHE_NAME = 'powerball-v5';
const urlsToCache = [
    '/powerball-checker/',
    '/powerball-checker/index.html',
    '/powerball-checker/help.html',
    '/powerball-checker/style.css',
    '/powerball-checker/app.js',
    '/powerball-checker/confetti.js',
    '/powerball-checker/manifest.json',
    '/powerball-checker/icons/icon-192.svg',
    '/powerball-checker/icons/icon-512.svg'
];

// Install event - cache assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Return cached version or fetch from network
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
