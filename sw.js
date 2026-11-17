'use strict';

const BUILD = '2026.11.17.1';
const BASE = self.registration.scope;
const PREFIX = 'calcrate-web:' + BASE + ':';
const CACHE = PREFIX + BUILD;

const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png'
];

const ASSETS = new Set(
  FILES.map(path => new URL(path, BASE).href)
);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const requests = FILES.map(path =>
      new Request(new URL(path, BASE), {
        cache: 'reload',
        credentials: 'same-origin'
      })
    );

    // Установка успешна, только если получен весь комплект.
    await cache.addAll(requests);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();

    // Не трогаем кэши других приложений и областей.
    await Promise.all(
      keys
        .filter(key => key.startsWith(PREFIX) && key !== CACHE)
        .map(key => caches.delete(key))
    );

    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  const scope = new URL(BASE);
  const navigation = request.mode === 'navigate';

  if (request.method !== 'GET') return;
  if (url.origin !== scope.origin) return;
  if (!url.pathname.startsWith(scope.pathname)) return;
  if (!navigation && !ASSETS.has(url.href)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);

    async function fallback() {
      const exact = await cache.match(request);
      if (exact) return exact;

      // HTML возвращаем только для перехода на страницу,
      // но не вместо PNG, JSON, CSS или JavaScript.
      if (navigation) {
        return cache.match(new URL('./index.html', BASE).href);
      }

      return undefined;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);

    try {
      const response = await fetch(
        new Request(request, {
          cache: 'no-cache',
          signal: controller.signal
        })
      );

      if (response.ok) {
        try {
          await cache.put(request, response.clone());
        } catch (_) {
          // Ошибка квоты не должна мешать сетевому запуску.
        }
        return response;
      }

      return (await fallback()) || response;
    } catch (_) {
      return (await fallback()) || Response.error();
    } finally {
      clearTimeout(timer);
    }
  })());
});
