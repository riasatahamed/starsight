const CACHE_NAME = 'starsight-v20';

// StarSight is a PWA, but fresh deployments should win over stale cache entries.
// We therefore use a network-first strategy for the app shell and keep cache only
// as an offline fallback. The worker itself is registered with updateViaCache:'none'.
const APP_SHELL = [
  './',
  './index.html?v=20',
  './style.css?v=20',
  './data.js?v=20',
  './expanded_stars.js?v=20',
  './telescope.js?v=20',
  './observingLog.js?v=20',
  './api.js?v=20',
  './main.js?v=20',
  './manifest.json?v=20',
  './images/StarSight_Logo.png?v=20'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      // Cache individually so one missing optional asset cannot abort installation.
      await Promise.allSettled(APP_SHELL.map(async url => {
        try {
          const response = await fetch(url, { cache: 'no-store' });
          if (response.ok) await cache.put(url, response);
        } catch (_) {}
      }));
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names => Promise.all(
      names.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
    )).then(() => self.clients.claim())
  );
});

const isLiveApi = url =>
  url.hostname.includes('open-meteo.com') ||
  url.hostname.includes('wheretheiss.at') ||
  url.hostname.includes('bigdatacloud.net') ||
  url.hostname.includes('astrometry.net') ||
  url.pathname.includes('apod.json');

const isSameOrigin = url => url.origin === self.location.origin;

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Never cache live astronomy/weather/location/API responses.
  if (isLiveApi(url)) {
    event.respondWith(fetch(request).catch(() => new Response(JSON.stringify({ error: 'offline' }), {
      status: 503, headers: { 'Content-Type': 'application/json' }
    })));
    return;
  }

  // Navigation: always ask the network first so a new GitHub Pages deployment
  // appears immediately; cached index is only an offline fallback.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put('./index.html?v=20', copy)).catch(() => {});
          }
          return response;
        })
        .catch(() => caches.match('./index.html?v=20').then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // Same-origin assets: network first, cache as offline fallback. This prevents
  // old JS/CSS from winning after a deployment while preserving offline use.
  if (isSameOrigin(url)) {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then(response => {
          if (response.ok && response.type !== 'opaque') {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(() => {});
          }
          return response;
        })
        .catch(() => caches.match(request).then(r => r || new Response(null, { status: 503, statusText: 'Offline and not cached' })))
    );
    return;
  }

  // Third-party resources (e.g. fonts/CDN): normal network request, with cache
  // fallback only if the browser already has one.
  event.respondWith(
    fetch(request).catch(() => caches.match(request).then(r => r || new Response(null, { status: 503 })))
  );
});
