self.addEventListener("push", function (event) {
  try {
    const data = event.data ? event.data.json() : {};
    const title =
      (data.notification && data.notification.title) ||
      data.title ||
      "Ashish Properties";
    const body =
      (data.notification && data.notification.body) || data.body || "";
    const icon =
      (data.notification && data.notification.icon) ||
      data.icon ||
      "/favicon.ico";
    const tag =
      (data.notification && data.notification.tag) ||
      data.tag ||
      "notification";

    const options = {
      body,
      icon,
      tag,
      badge: "/favicon.ico",
      vibrate: [100, 50, 100],
      renotify: true,
      requireInteraction: false,
      data: {
        url:
          (data.notification && data.notification.click_action) ||
          (data.data && data.data.url) ||
          "/notifications",
        timestamp: Date.now(),
      },
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (e) {
    console.error("Push notification error:", e);
    // Fallback: show basic notification
    event.waitUntil(
      self.registration.showNotification("Ashish Properties", {
        body: "You have a new notification",
        badge: "/favicon.ico",
        vibrate: [100, 50, 100],
      }),
    );
  }
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  const url =
    (event.notification &&
      event.notification.data &&
      event.notification.data.url) ||
    "/notifications";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // Try to find and focus existing window
        for (let client of windowClients) {
          if (client.url.includes(url) && "focus" in client) {
            return client.focus();
          }
        }
        // If no matching window, open a new one
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      }),
  );
});

self.addEventListener("notificationclose", function (event) {
  // Handle notification close if needed
  console.log("Notification closed:", event.notification.tag);
});
