// Doji service worker — network-first per l'HTML (aggiornamenti immediati),
// cache-first per gli asset statici. Offline: fallback alla cache.
const CACHE = 'doji-v29';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // L'app shell (index.html / navigazioni): NETWORK-FIRST.
  // Così ogni deploy su GitHub Pages arriva subito, anche senza bump
  // della versione cache. Offline → si usa la copia in cache.
  const isAppShell = req.mode === 'navigate'
    || (url.origin === location.origin
        && (url.pathname.endsWith('/') || url.pathname.endsWith('/index.html')));

  if (isAppShell) {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(cache => cache.put(req, copy)).catch(() => {});
        return res;
      }).catch(() =>
        caches.match(req).then(cached =>
          cached || caches.match('./index.html').then(idx => idx || Response.error())
        )
      )
    );
    return;
  }

  // Tutto il resto (icone, manifest, font, CDN): CACHE-FIRST.
  e.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(cache => cache.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => Response.error()); // mai respondWith(undefined)
    })
  );
});
