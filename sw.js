const CACHE_NAME = 'bluetgolf-sg-lite-v6';
const APP_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './data/courses.xml',
  './icons/app-icon.svg',
  './src/app.js',
  './src/styles.css',
  './src/domain/sg/calculateHoleSg.js',
  './src/domain/sg/calculateRoundSg.js',
  './src/domain/sg/expectedHoles.js',
  './src/domain/sg/expectedPutts.js',
  './src/domain/sg/insightRules.js',
  './src/domain/sg/interpolation.js',
  './src/domain/sg/sampleRound.js',
  './src/domain/sg/sgTypes.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      });
    }),
  );
});
