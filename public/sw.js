/* Minimal offline cache for the app shell. Registered only in production. */
const CACHE = 'wa-direct-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(['./', './index.html', './manifest.webmanifest']))
      .then(() => self.skipWaiting())
      .catch(() => undefined),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      .catch(() => undefined),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const copy = res.clone();
        caches
          .open(CACHE)
          .then((cache) => cache.put(event.request, copy))
          .catch(() => undefined);
        return res;
      })
      .catch(() =>
        caches.match(event.request).then(
          (hit) =>
            hit ||
            caches.match('./index.html').then((fallback) => {
              if (fallback) return fallback;
              return Response.error();
            }),
        ),
      ),
  );
});
