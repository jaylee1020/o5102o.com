const SHELL_CACHE = 'o5102o-shell-v5';
const PAGE_CACHE = 'o5102o-pages-v5';
const RETAINED_CACHE_NAMES = new Set(['o5102o-v4']);
const CRITICAL_PRECACHE_URLS = [
  '/',
  '/offline.html',
  '/site.css?v=5',
  '/site.js?v=5',
];
const OPTIONAL_PRECACHE_URLS = [
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// Hashed/versioned paths — safe to serve from cache forever.
const IMMUTABLE_PATH_PATTERN = /^\/(assets|vendor|models)\//;
const MANAGED_CACHE_PATTERN = /^o5102o-(?:v\d+|shell-v\d+|pages-v\d+)$/;

function isHtmlRequest(request) {
  return request.mode === 'navigate' || request.headers.get('Accept')?.includes('text/html');
}

function normalizedPageKey(request) {
  const url = new URL(request.url);
  url.searchParams.delete('t');
  return url.toString();
}

async function putInCache(cacheName, request, response) {
  const cache = await caches.open(cacheName);
  await cache.put(request, response);
}

function cacheLater(event, cacheName, request, response) {
  const task = putInCache(cacheName, request, response).catch(() => {});
  try {
    event.waitUntil(task);
  } catch (_error) {
    // The response remains usable even if this event can no longer be extended.
  }
}

async function matchRetained(request, alternateKey) {
  for (const cacheName of RETAINED_CACHE_NAMES) {
    if (!(await caches.has(cacheName))) continue;
    const cache = await caches.open(cacheName);
    const response = (alternateKey && await cache.match(alternateKey)) || await cache.match(request);
    if (response) return response;
  }
  return null;
}

async function networkFirstPage(event) {
  const { request } = event;
  const pageKey = normalizedPageKey(request);

  try {
    const response = (await event.preloadResponse) || (await fetch(request));
    if (response && response.ok) {
      cacheLater(event, PAGE_CACHE, pageKey, response.clone());
    }
    return response;
  } catch (_error) {
    const pageCache = await caches.open(PAGE_CACHE);
    const shellCache = await caches.open(SHELL_CACHE);
    const cached = await pageCache.match(pageKey)
      || await shellCache.match(pageKey)
      || await matchRetained(request, pageKey);
    if (cached) return cached;

    return (await shellCache.match('/offline.html')) || Response.error();
  }
}

async function networkFirstManifest(event) {
  const { request } = event;
  try {
    const response = await fetch(request);
    if (response.ok) cacheLater(event, SHELL_CACHE, request, response.clone());
    return response;
  } catch (_error) {
    const cache = await caches.open(SHELL_CACHE);
    return (await cache.match('/manifest.json')) || (await matchRetained(request)) || Response.error();
  }
}

async function cacheFirst(event) {
  const { request } = event;
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) cacheLater(event, SHELL_CACHE, request, response.clone());
    return response;
  } catch (_error) {
    return (await matchRetained(request)) || Response.error();
  }
}

// Serve from cache instantly, then refresh in the background. Cache writes are
// best-effort so private-mode or quota failures never hide a valid response.
async function staleWhileRevalidate(event) {
  const { request } = event;
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(request);

  if (cached) {
    const task = fetch(request)
      .then((response) => {
        if (response.ok) return putInCache(SHELL_CACHE, request, response.clone());
        return null;
      })
      .catch(() => {});
    try {
      event.waitUntil(task);
    } catch (_error) {}
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) cacheLater(event, SHELL_CACHE, request, response.clone());
    return response;
  } catch (_error) {
    return (await matchRetained(request)) || Response.error();
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(async (cache) => {
      await cache.addAll(CRITICAL_PRECACHE_URLS);
      await Promise.all(OPTIONAL_PRECACHE_URLS.map((url) => cache.add(url).catch(() => null)));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }

      const keep = new Set([SHELL_CACHE, PAGE_CACHE, ...RETAINED_CACHE_NAMES]);
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => MANAGED_CACHE_PATTERN.test(key) && !keep.has(key))
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

  if (isHtmlRequest(request)) {
    event.respondWith(networkFirstPage(event));
    return;
  }

  if (url.pathname === '/manifest.json') {
    event.respondWith(networkFirstManifest(event));
    return;
  }

  if (IMMUTABLE_PATH_PATTERN.test(url.pathname)) {
    event.respondWith(cacheFirst(event));
    return;
  }

  event.respondWith(staleWhileRevalidate(event));
});
