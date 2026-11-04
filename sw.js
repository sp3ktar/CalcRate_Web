// CalcRate: the app works offline. Its own files: from the network when it answers (a new version comes at once, the
// browser's HTTP cache is checked with the site), else from the cache. The rates go straight to their site (the app keeps the last ones itself).
const CACHE = 'calcrate-v2';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png',
  './icon-maskable-512.png', './apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  // past the browser's own cache (GitHub Pages lets it keep a file 10 minutes): an update shows at the next start
  e.respondWith(fetch(new Request(e.request.url, { cache: 'no-cache', credentials: 'same-origin' }))
    .then((r) => {
      if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
      return r;
    })
    .catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html'))));
});
