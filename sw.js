const CACHE_NAME = 'qr-master-pro-v1';
// Optimiser la liste des ressources à mettre en cache
const ASSETS = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    // CDN resources...
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
    );
});
