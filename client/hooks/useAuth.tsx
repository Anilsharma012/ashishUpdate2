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

type UserType = "buyer" | "seller" | "agent" | "admin" | "staff";

interface User {
  id?: string;
  _id?: string;
  uid?: string;
  name?: string;
  email?: string;
  phone?: string;
  userType?: UserType;
  role?: string;
  username?: string;
  permissions?: string[];
  roleInfo?: { displayName: string; permissions: string[] };
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
    } catch {}

    // ---- read canonical admin keys ----
    try {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      const storedUser = localStorage.getItem(USER_KEY);

      if (storedToken && storedUser) {
        const parsedUser = JSON.parse(storedUser);
        if (storedToken.length > 10 && getUserId(parsedUser)) {
          setToken(storedToken);
          setUser(parsedUser);
          apiClient.setToken(storedToken); // attach on boot
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
    // Store token under multiple keys for compatibility with different parts of the app
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem("token", newToken); // Generic key for legacy code

    // Store role-specific tokens for seller/admin/user flows
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
    apiClient.setToken(newToken); // future requests authorized
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
      "userToken",
      "authToken",
    ];
    for (const key of keysToRemove) {
      try {
        localStorage.removeItem(key);
      } catch {}
    }
    setToken(null);
    setUser(null);
    apiClient.clearToken?.(); // optional helper in apiClient
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
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};
