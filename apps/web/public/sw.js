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

self.addEventListener("push", (event) => {
  event.waitUntil((async () => {
    let message = {};
    try {
      message = event.data?.json() ?? {};
    } catch {
      message = {};
    }
    const unreadCount = Number.isInteger(message.unreadCount)
      ? Math.max(0, message.unreadCount) : null;
    await self.registration.showNotification(message.title || "Новое оповещение", {
      body: message.body || "В игре появилось новое сообщение.",
      icon: "/pwa/icon-192.png",
      badge: "/pwa/icon-192.png",
      tag: typeof message.id === "string" ? message.id : "financial-journey-notification",
      data: { url: "/notifications" }
    });
    if (unreadCount !== null && "setAppBadge" in self.navigator) {
      try {
        if (unreadCount > 0) await self.navigator.setAppBadge(unreadCount);
        else await self.navigator.clearAppBadge();
      } catch {
        // Badging is optional on this platform.
      }
    }
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) client.postMessage({ type: "NOTIFICATIONS_CHANGED" });
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const target = new URL("/notifications", self.location.origin).href;
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = windows.find((client) => client.url === target);
    if (existing) {
      await existing.focus();
    } else {
      await self.clients.openWindow(target);
    }
  })());
});
