// src/hooks/useAuth.tsx
import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { clearToasts } from "@/hooks/use-toast";
import { apiClient } from "@/lib/apiClient";
import { getFcmToken, listenForegroundNotifications } from "@/lib/messaging";

type UserType = "buyer" | "seller" | "agent" | "admin" | "staff";

interface User {
  id?: string;
  _id?: string;
  uid?: string;
  name?: string;
  email?: string;
  phone?: string;
  userType?: UserType | string;
  role?: string;
  isFirstLogin?: boolean;
  lastLogin?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "adminToken";
const USER_KEY = "adminUser";

function getUserId(u: any) {
  return u?.id || u?._id || u?.uid || null;
}

function syncFcmTokenIfGranted(authToken: string) {
  // Don’t prompt here; only sync if permission already granted
  try {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    setTimeout(async () => {
      try {
        const fcmToken = await getFcmToken();
        if (!fcmToken) return;

        await fetch("/api/fcm/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            token: fcmToken,
            deviceInfo: {
              userAgent: navigator.userAgent,
              platform: navigator.platform,
            },
          }),
        });

        listenForegroundNotifications();
        console.log("📱 FCM token synced");
      } catch (e) {
        console.warn("FCM sync failed (non-fatal):", e);
      }
    }, 1500);
  } catch (e) {
    console.warn("FCM sync skipped:", e);
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ---- migration (old generic keys -> admin keys) ----
    try {
      const oldTok = localStorage.getItem("token");
      const oldUsr = localStorage.getItem("user");
      const hasNew = !!localStorage.getItem(TOKEN_KEY);

      if (!hasNew && oldTok && oldUsr) {
        localStorage.setItem(TOKEN_KEY, oldTok);
        localStorage.setItem(USER_KEY, oldUsr);
      }

      const storedToken = localStorage.getItem(TOKEN_KEY);
      const storedUser = localStorage.getItem(USER_KEY);

      if (storedToken && storedUser) {
        const parsedUser = JSON.parse(storedUser);

        if (storedToken.length > 10 && getUserId(parsedUser)) {
          setToken(storedToken);
          setUser(parsedUser);
          apiClient.setToken(storedToken); // attach on boot
          syncFcmTokenIfGranted(storedToken);
        } else {
          throw new Error("Invalid token or user data");
        }
      }
    } catch (err) {
      console.error("Auth boot error:", err);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = (newToken: string, newUser: User) => {
    try {
      clearToasts();
    } catch {}

    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem("token", newToken);

    if (newUser.userType === "seller") {
      localStorage.setItem("sellerToken", newToken);
    } else if (newUser.userType === "admin") {
      localStorage.setItem("adminToken", newToken);
    } else if (newUser.userType === "user") {
      localStorage.setItem("userToken", newToken);
    }

    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    apiClient.setToken(newToken);

    // ✅ If already granted, sync now
    syncFcmTokenIfGranted(newToken);
  };

  const logout = () => {
    try {
      clearToasts();
    } catch {}

    const keysToRemove = [
      TOKEN_KEY,
      USER_KEY,
      "token",
      "user",
      "adminToken",
      "adminUser",
      "sellerToken",
      "sellerUser",
      "userToken",
      "userUser",
    ];

    keysToRemove.forEach((k) => localStorage.removeItem(k));
    setToken(null);
    setUser(null);
    apiClient.setToken("");
    clearToasts();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        login,
        logout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
