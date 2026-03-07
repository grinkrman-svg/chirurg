const CACHE_NAME = 'chirurg-v2';
const ASSETS = [
  './',
  './medoc.html',
  './medoc-mobile.html',
  './manifest-v2.json',
  'https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&family=Fira+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

// Install — cache core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

// Activate — clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

// Fetch — network first for API, cache first for assets
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Never cache webhook requests
  if (url.hostname.includes('n8n.cloud') || url.hostname.includes('api.anthropic')) {
    return event.respondWith(fetch(event.request));
  }

  // Never cache radio streams
  if (url.hostname.includes('rmfstream') || url.hostname.includes('radiostream') ||
      url.hostname.includes('polskieradio') || url.hostname.includes('nadaje.com')) {
    return event.respondWith(fetch(event.request));
  }

  // Cache first for everything else
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        // Cache successful responses
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    }).catch(() => {
      // Offline fallback
      if (event.request.destination === 'document') {
        return caches.match('./medoc.html');
      }
    })
  );
});
