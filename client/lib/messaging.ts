import {
  getMessaging,
  getToken,
  onMessage,
  Messaging,
} from "firebase/messaging";
import app from "./firebase";

/**
 * VAPID key (from .env)
 * VITE_FIREBASE_VAPID_KEY=xxxxxxxx
 */
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as
  | string
  | undefined;

let messaging: Messaging | null = null;

/* -------------------------------------------------------
   Init Firebase Messaging (safe for SSR & build)
------------------------------------------------------- */
export function initMessaging() {
  if (typeof window === "undefined") return;

  try {
    messaging = getMessaging(app);
  } catch (err) {
    console.warn("Firebase messaging init failed:", err);
    messaging = null;
  }
}

/* -------------------------------------------------------
   Push Permission (NON-BLOCKING)
------------------------------------------------------- */
export async function ensurePushPermission(): Promise<
  NotificationPermission | null
> {
  if (typeof window === "undefined") return null;
  if (!("Notification" in window)) return null;

  try {
    if (Notification.permission === "granted") return "granted";
    if (Notification.permission === "denied") return "denied";

    // request only if default
    const result = await Notification.requestPermission();
    return result;
  } catch (err) {
    console.warn("Push permission error:", err);
    return null;
  }
}

/**
 * Backward compatibility
 * (fixes your build error)
 */
export const ensurePushPermissionNonBlocking = ensurePushPermission;

/* -------------------------------------------------------
   Get FCM Token
------------------------------------------------------- */
export async function getFcmToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;

  if (!messaging) initMessaging();
  if (!messaging) return null;

  if (!VAPID_KEY) {
    console.warn("FCM VAPID key missing; skipping push setup");
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js",
    );

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    return token || null;
  } catch (err) {
    console.warn("FCM getToken failed:", err);
    return null;
  }
}

/* -------------------------------------------------------
   Foreground Notifications Listener
------------------------------------------------------- */
export function listenForegroundNotifications() {
  if (typeof window === "undefined") return () => {};

  if (!messaging) initMessaging();
  if (!messaging) return () => {};

  return onMessage(messaging, (payload) => {
    try {
      if (Notification.permission !== "granted") return;

      const title = payload.notification?.title || "Notification";
      const body = payload.notification?.body || "";

      new Notification(title, {
        body,
        icon: payload.notification?.icon || "/favicon.ico",
      });
    } catch (err) {
      console.warn("Foreground notification error:", err);
    }
  });
}

/* -------------------------------------------------------
   Subscribe Token to Topic (Backend API)
------------------------------------------------------- */
export async function subscribeTokenToGeneralTopic(token: string) {
  try {
    await fetch("/api/notifications/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        topic: "general",
      }),
    });
  } catch (err) {
    console.warn("Topic subscribe failed (non-fatal):", err);
  }
}
