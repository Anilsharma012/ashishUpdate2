import React, { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { ensurePushPermission, getFcmToken } from "../lib/messaging";

/**
 * Prompts user to enable push notifications
 * Shows once per session when user first visits or logs in
 */
export default function NotificationPermissionPrompt() {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if user has already dismissed this session
    const dismissed = sessionStorage.getItem("notif-prompt-dismissed");
    if (dismissed) return;

    // Check if notifications already enabled
    if ("Notification" in window) {
      if (
        Notification.permission === "default" ||
        Notification.permission === "prompt"
      ) {
        // Show prompt after a short delay to avoid blocking UI
        setTimeout(() => {
          setShow(true);
        }, 2000);
      }
    }
  }, []);

  const handleEnable = async () => {
    setLoading(true);
    try {
      const permission = await ensurePushPermission();
      if (permission === "granted") {
        const token = await getFcmToken();
        if (token) {
          console.log("✅ Notifications enabled and FCM token obtained");
        }
      }
      setShow(false);
      sessionStorage.setItem("notif-prompt-dismissed", "true");
    } catch (error) {
      console.error("Error enabling notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setShow(false);
    sessionStorage.setItem("notif-prompt-dismissed", "true");
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 md:p-6">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <Bell className="h-6 w-6 text-[#C70000]" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">
              Enable Notifications
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Get real-time updates about your property inquiries, messages, and
              important notifications from Ashish Properties.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleEnable}
                disabled={loading}
                className="flex-1 bg-[#C70000] text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Enabling..." : "Enable"}
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Later
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
