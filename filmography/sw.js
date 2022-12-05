// cache name
const CACHE_NAME = 'static';

// files to precache
const precacheResources = [
    '/',
    '/manifest.json',
    '/index.html',
    '/img/favicon.ico',
    '/css/app.css',
    '/js/fuseConfig.js',
    '/js/fuseService.js',
    '/js/main.js',
    '/js/MyCacheStrategies.js',
    '/js/OfflineController.js'
];

// When the service worker is installing, open the cache and add the precache resources to it
self.addEventListener('install', (event) => {
    console.log('myOPTapp ServiceWorker install event!');
    event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(precacheResources)));
});

self.addEventListener('activate', (event) => {
    console.log('myOPTapp ServiceWorker activate event!');
});

// When there's an incoming fetch request, try and respond with a precached resource, otherwise fall back to the network
self.addEventListener('fetch', (event) => {
    console.log('myOPTapp Fetch intercepted for:', event.request.url);
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(event.request);
        }),
    );
});