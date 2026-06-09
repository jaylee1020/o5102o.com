const CACHE_NAME = 'o5102o-v4';
const PRECACHE_URLS = [
  '/',
  '/site.js',
  '/icon-192.png',
  '/icon-512.png',
];

// Hashed/versioned paths — safe to serve from cache forever.
const IMMUTABLE_PATH_PATTERN = /^\/(assets|vendor|models)\//;

function isHtmlRequest(request) {
  return request.mode === 'navigate' || request.headers.get('Accept')?.includes('text/html');
}

function isManifestRequest(url) {
  return url.pathname === '/manifest.json';
}

async function putInCache(request, response) {
  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response);
}

async function networkFirst(event, fallbackRequest) {
  const { request } = event;
  try {
    const response = (await event.preloadResponse) || (await fetch(request));
    if (response && response.ok) {
      event.waitUntil(putInCache(request, response.clone()));
    }
    return response;
  } catch (_error) {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    return caches.match(fallbackRequest);
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  if (response.ok) {
    await putInCache(request, response.clone());
  }
  return response;
}

// Serve from cache instantly, refresh the cache in the background so
// non-hashed assets (site.js, icons) pick up updates on the next visit.
async function staleWhileRevalidate(event) {
  const { request } = event;
  const cached = await caches.match(request);

  const refresh = fetch(request).then((response) => {
    if (response.ok) {
      putInCache(request, response.clone());
    }
    return response;
  });

  if (cached) {
    event.waitUntil(refresh.catch(() => {}));
    return cached;
  }

  return refresh;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  if (isHtmlRequest(request) || isManifestRequest(url)) {
    event.respondWith(networkFirst(event, '/'));
    return;
  }

  if (IMMUTABLE_PATH_PATTERN.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(event));
});
