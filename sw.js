const CACHE_VERSION = "v2";
const CACHE_NAME = `o5102o-${CACHE_VERSION}`;
const HTML_FALLBACK_URL = "/";
const PRECACHE_URLS = ["/", "/icon-192.png", "/icon-512.png", "/manifest.json"];

function isLocalGetRequest(request) {
  const url = new URL(request.url);

  return (
    request.method === "GET" &&
    url.origin === self.location.origin &&
    !url.pathname.startsWith("/api/")
  );
}

function isHtmlRequest(request) {
  const acceptHeader = request.headers.get("Accept") || "";
  return acceptHeader.includes("text/html");
}

async function putInCache(request, response) {
  if (!response?.ok) {
    return response;
  }

  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response.clone());
  return response;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    return await putInCache(request, response);
  } catch {
    return (await caches.match(request)) || caches.match(HTML_FALLBACK_URL);
  }
}

async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  const response = await fetch(request);
  return putInCache(request, response);
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (!isLocalGetRequest(request)) {
    return;
  }

  event.respondWith(isHtmlRequest(request) ? networkFirst(request) : cacheFirst(request));
});
