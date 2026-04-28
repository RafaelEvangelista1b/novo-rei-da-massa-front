const CACHE_NAME = 'reimassa-cache-v8';
const ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './assets/images/whatsapp.png',
    './assets/images/banner.png',
    './assets/images/logo64.png',
    './assets/images/logo512.png'
];

self.addEventListener('install', (event) => {
    event.waitUtil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('preparando a massa! 🥐');
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respodWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            )
        })
    )
})

