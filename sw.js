const CACHE_NAME = 'starsight-v1';

// Static assets needed to run StarSight completely offline
const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './data.js',
  './telescope.js',
  './observingLog.js',
  './api.js',
  './main.js',
  './images/StarSight_Logo.png',
  'https://cdn.jsdelivr.net/npm/astronomy-engine@2.1.19/astronomy.browser.min.js',
  'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap'
];

// Pre-cache static assets during installation
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(APP_SHELL);
    }).then(() => self.skipWaiting())
  );
});

// Clean up previous caches upon activation
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Intercept network requests
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Allow live API endpoints to fetch directly from network without caching errors
  const isLiveApi = url.hostname.includes('open-meteo.com') ||
                    url.hostname.includes('wheretheiss.at') ||
                    url.hostname.includes('bigdatacloud.net') ||
                    url.hostname.includes('astrometry.net') ||
                    url.pathname.includes('apod.json');

  if (isLiveApi) {
    event.respondWith(
      fetch(event.request).catch(() => new Response(JSON.stringify({ error: 'offline' }), {
        headers: { 'Content-Type': 'application/json' }
      }))
    );
    return;
  }

  // Cache-first strategy for app shell assets
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then(networkResponse => {
        // Cache Google Font webfont files when fetched
        if (networkResponse && networkResponse.status === 200 && url.hostname.includes('gstatic.com')) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
        }
        return networkResponse;
      });
    })
  );
});