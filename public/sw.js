// public/sw.js  (FIXED)
const CACHE_NAME = "app-cache-v1";
const URLS_TO_CACHE = ["/", "/manifest.webmanifest", "/manifest.json", "/favicon.ico"];
// NOTE: /static/... paths ko abhi mat add karo; Vite/React build me hash names hote hain, missing file par install fail ho jata hai.

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(URLS_TO_CACHE);
      self.skipWaiting(); // new SW ko turant activate karne ke liye
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : undefined))
      );
      self.clients.claim(); // pages ko control me lo
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // API ya non-GET ko SW se bypass karo
  if (req.method !== "GET" || url.pathname.startsWith("/api/")) return;

  // HTML navigations: network-first, offline me cache fallback
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

  // Static assets: cache-first, then network
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
   - This is REQUIRED for system notification tray.
   - Your backend sends: { notification: {title, body}, data: { url, ... } }
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
    // Fallback: show basic notification
    event.waitUntil(
      self.registration.showNotification("Notification", {
        body: "You have a new message",
      }),
    );
  }
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  const url = (event.notification && event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (let client of windowClients) {
          // If already open on same origin, focus it
          if ("focus" in client) {
            // If client is already at same URL (or same app), just focus
            if (client.url.includes(url)) return client.focus();
          }
        }
        // Otherwise open new
        if (clients.openWindow) return clients.openWindow(url);
      }),
  );
});

self.addEventListener("notificationclose", function (event) {
  // Handle notification close if needed
  // console.log("Notification closed:", event.notification.tag);
});
