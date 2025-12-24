import { useState, useEffect, useRef } from "react";
import { Menu, Search, Heart, Bell, X } from "lucide-react";
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  getRohtakSectors,
  getRohtakColonies,
  getRohtakLandmarks,
} from "../data/rohtakLocations";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useNotificationsUnread } from "@/hooks/useNotificationsUnread";

/* ---------- local favorites (logged-out fallback) ---------- */
const getLocalFavIds = (): string[] => {
  try {
    const raw = localStorage.getItem("favorites");
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.map(String) : [];
  } catch {
    return [];
  }
};

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchType, setSearchType] =
    useState<"sectors" | "colonies" | "landmarks">("sectors");

  const { token } = useAuth();
  const [wishlistCount, setWishlistCount] = useState<number>(0);
  const notificationCount = useNotificationsUnread();
  const loc = useLocation();
  const loadingRef = useRef(false);

  const apiGet = async (path: string) => {
    const anyWin = window as any;
    if (anyWin.api) return anyWin.api(path);
    const res = await fetch(`/api/${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      credentials: "include",
    });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, json };
  };

  const loadWishlistCount = async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      if (!token) {
        setWishlistCount(getLocalFavIds().length);
        return;
      }
      const res = await apiGet("favorites/my");
      const count = Array.isArray(res?.json?.data) ? res.json.data.length : 0;
      setWishlistCount(count);
    } catch {
      setWishlistCount(0);
    } finally {
      loadingRef.current = false;
    }
  };

  useEffect(() => {
    loadWishlistCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, loc.pathname]);

  useEffect(() => {
    const onFavChanged = () => loadWishlistCount();
    const onVisible = () => {
      if (document.visibilityState === "visible") loadWishlistCount();
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === "favorites") loadWishlistCount();
      if (["token", "adminToken", "authToken"].includes(e.key || "")) {
        loadWishlistCount();
      }
    };

    window.addEventListener("favorites:changed", onFavChanged);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("favorites:changed", onFavChanged);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const getSearchOptions = () => {
    switch (searchType) {
      case "sectors":
        return getRohtakSectors();
      case "colonies":
        return getRohtakColonies();
      case "landmarks":
        return getRohtakLandmarks();
      default:
        return getRohtakSectors();
    }
  };

  return (
    <header className="bg-[#C70000] text-white sticky top-0 z-50">
      {/* Scoped CSS */}
      <style>{`
        .ap-search-row .lucide-heart,
        .ap-search-row a[href="/wishlist"] {
          display: none !important;
        }
      `}</style>

      {/* ================= TOP BAR ================= */}
      <div className="flex items-center justify-between px-4 py-3">
        {/* Logo */}
        <div className="flex items-center space-x-3">
        
          <span className="text-lg font-bold tracking-wide">
            ASHISH PROPERTIES
          </span>
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-3">
          {/* Wishlist */}
          <Link
            to="/wishlist"
            className="p-2 bg-white/20 rounded-lg relative"
          >
            <Heart className="h-5 w-5" />
            {wishlistCount > 0 && (
              <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] rounded-full bg-white text-[#C70000] text-[10px] leading-[18px] text-center font-bold">
                {wishlistCount}
              </span>
            )}
          </Link>

          {/* Notifications */}
          <Link
            to="/user-dashboard?tab=notifications"
            className="p-2 bg-white/20 rounded-lg relative"
          >
            <Bell className="h-5 w-5" />
            {notificationCount > 0 && (
              <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] rounded-full bg-yellow-400 text-gray-900 text-[10px] leading-[18px] text-center font-bold">
                {notificationCount > 99 ? "99+" : notificationCount}
              </span>
            )}
          </Link>

          {/* Mobile Menu */}
          <button
            className="p-2 md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* ================= MOBILE MENU ================= */}
      {isMenuOpen && (
        <div className="md:hidden bg-[#A60000] px-4 py-4">
          <nav className="flex flex-col space-y-3">
            <Link to="/" className="py-2">Home</Link>
            <Link to="/categories" className="py-2">Categories</Link>
            <Link to="/maps" className="py-2 font-bold">Maps</Link>
            <Link to="/new-projects" className="py-2 font-bold">New Projects</Link>
            <Link to="/post-property" className="py-2">Post Properties</Link>
          </nav>
        </div>
      )}

      {/* ================= SEARCH ================= */}
      <div className="px-4 pb-4 ap-search-row">
        <div className="flex space-x-2 mb-3">
          {(["sectors", "colonies", "landmarks"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setSearchType(t)}
              className={`px-3 py-1 rounded-full text-xs ${
                searchType === t
                  ? "bg-white text-[#C70000]"
                  : "bg-white/20"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex space-x-2">
          <Select>
            <SelectTrigger className="h-12 bg-white text-gray-900">
              <SelectValue placeholder={`Select ${searchType}`} />
            </SelectTrigger>
            <SelectContent>
              {getSearchOptions().map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button className="h-12 bg-white text-[#C70000]">
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
