const CACHE_NAME = "financial-journey-static-v1";
const PRECACHE_URLS = [
  "/offline.html",
  "/logo.svg",
  "/pwa/icon-192.png",
  "/pwa/icon-512.png",
  "/pwa/icon-maskable-512.png"
];
const PUBLIC_ASSETS = new Set(PRECACHE_URLS);

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("financial-journey-static-") && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      ),
      self.clients.claim()
    ])
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => (await caches.match("/offline.html")) || Response.error())
    );
    return;
  }

  if (!url.pathname.startsWith("/_next/static/") && !PUBLIC_ASSETS.has(url.pathname)) return;

  event.respondWith(
    caches.match(request).then(async (cached) => {
      if (cached) return cached;

      const response = await fetch(request);
      if (response.ok && response.type === "basic") {
        try {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
          const assets = (await cache.keys()).filter((key) =>
            new URL(key.url).pathname.startsWith("/_next/static/")
          );
          if (assets.length > 100) await cache.delete(assets[0]);
        } catch {
          // A full or unavailable cache must not prevent the asset from loading.
        }
      }
      return response;
    })
  );
});
