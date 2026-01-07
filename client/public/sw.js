// client/public/sw.js
const CACHE_NAME = "ap-cache-v2";
const URLS_TO_CACHE = ["/", "/manifest.webmanifest", "/favicon.ico"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(URLS_TO_CACHE);
      self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : undefined)));
      self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== "GET" || url.pathname.startsWith("/api/")) return;

  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          const cache = await caches.open(CACHE_NAME);
          cache.put(req, res.clone());
          return res;
        } catch {
          return (await caches.match(req)) || (await caches.match("/"));
        }
      })()
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      const res = await fetch(req);
      try {
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, res.clone());
      } catch {}
      return res;
    })()
  );
});

/* =========================================================
   PUSH NOTIFICATIONS (FCM Web / TWA)
========================================================= */
self.addEventListener("push", function (event) {
  try {
    const data = event.data ? event.data.json() : {};
    const title =
      (data.notification && data.notification.title) ||
      data.title ||
      "Ashish Properties";
    const body = (data.notification && data.notification.body) || data.body || "";
    const icon =
      (data.notification && data.notification.icon) ||
      data.icon ||
      "/favicon.ico";
    const tag =
      (data.notification && data.notification.tag) ||
      data.tag ||
      "general";

    const url =
      (data.data && (data.data.url || data.data.click_action)) ||
      data.url ||
      "/";

    const options = {
      body,
      icon,
      tag,
      badge: "/favicon.ico",
      vibrate: [100, 50, 100],
      renotify: true,
      data: {
        ...((data.data && typeof data.data === "object") ? data.data : {}),
        url,
      },
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (e) {
    event.waitUntil(
      self.registration.showNotification("Notification", {
        body: "You have a new message",
      })
    );
  }
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const url = (event.notification && event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if ("focus" in client) {
          if (client.url.includes(url)) return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
