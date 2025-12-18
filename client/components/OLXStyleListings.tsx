import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Clock, Send } from "lucide-react";
import PropertyLoadingSkeleton from "./PropertyLoadingSkeleton";
import EnquiryModal from "./EnquiryModal";
import { MapPin } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

/* ----------------------------- Types ----------------------------- */
interface Property {
  _id: string;
  title: string;
  price: number;
  location: { city: string; state: string; address?: string };
  images: (string | { url: string })[];
  coverImageUrl?: string;
  propertyType: string;
  createdAt: string;

  // flags coming from backend (optional)
  premium?: boolean;
  isPremium?: boolean;
  isAdminPosted?: boolean;
  plan?: string;
  source?: string;
  postedBy?: { role?: string; _id?: string };
  createdBy?: { role?: string; _id?: string };
  ownerRole?: string;

  contactInfo: { name?: string };
}

/* -------- LocalStorage helpers (for logged-out wishlist) -------- */
const getLocalFavIds = (): string[] => {
  try {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem("favorites");
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.map(String) : [];
  } catch {
    return [];
  }
};

const setLocalFavIds = (ids: string[]) => {
  if (typeof window === "undefined") return;
  localStorage.setItem("favorites", JSON.stringify(Array.from(new Set(ids))));
};

export default function OLXStyleListings() {
  const navigate = useNavigate();
  const { token } = useAuth();

  /* --------------------------- Listing State --------------------------- */
  const PAGE_SIZE = 24;

  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  /* --------------------------- Favorites State -------------------------- */
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favBusy, setFavBusy] = useState<string | null>(null);
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);

  /* --------------------------- Enquiry Modal --------------------------- */
  const [enquiryModalOpen, setEnquiryModalOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(
    null,
  );

  /* --------------------------- Helpers --------------------------- */
  const notify = useCallback(
    (msg: string, type: "success" | "error" = "success") => {
      try {
        type === "success" ? toast.success(msg) : toast.error(msg);
      } catch {
        alert(msg);
      }
    },
    [],
  );

  const buildAuthHeaders = useCallback(() => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    const ls = typeof window !== "undefined" ? window.localStorage : null;

    const bearer =
      token ||
      ls?.getItem("token") ||
      ls?.getItem("adminToken") ||
      ls?.getItem("authToken");
    if (bearer) h["Authorization"] = `Bearer ${bearer}`;

    const xAuth = ls?.getItem("x-auth-token");
    if (xAuth) h["x-auth-token"] = xAuth;

    const admin = ls?.getItem("adminToken");
    if (admin) h["adminToken"] = admin;

    return h;
  }, [token]);

  const apiGet = useCallback(
    async (path: string) => {
      const anyWin = window as any;
      const opts = {
        headers: buildAuthHeaders(),
        credentials: "include" as const,
      };

      if (anyWin?.api) {
        try {
          const r = await anyWin.api(path, opts);
          return {
            ok: r?.ok ?? true,
            status: r?.status ?? 200,
            json: r?.json ?? r,
          };
        } catch {}
      }

      const res = await fetch(`/api/${path}`, opts as any);
      const json = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, json };
    },
    [buildAuthHeaders],
  );

  const apiWrite = useCallback(
    async (path: string, method: "POST" | "DELETE") => {
      const anyWin = window as any;
      const opts = {
        method,
        headers: buildAuthHeaders(),
        credentials: "include" as const,
      };

      if (anyWin?.api) {
        try {
          const r = await anyWin.api(path, opts);
          return {
            ok: r?.ok ?? (r?.status ? r.status < 400 : true),
            status: r?.status ?? 200,
            json: r?.json ?? r,
          };
        } catch {}
      }

      const res = await fetch(`/api/${path}`, opts as any);
      const json = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, json };
    },
    [buildAuthHeaders],
  );

  /* --------------------------- Mock fallback --------------------------- */
  const getMockList = useCallback((): Property[] => {
    const base = [
      {
        title: "3 BHK Flat for Sale in Rohtak",
        price: 4500000,
        location: { city: "Rohtak", state: "Haryana" },
        images: [
          "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800",
        ],
        propertyType: "apartment",
        contactInfo: { name: "Rajesh Kumar" },
      },
      {
        title: "2 BHK Independent House",
        price: 3200000,
        location: { city: "Rohtak", state: "Haryana" },
        images: [
          "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800",
        ],
        propertyType: "house",
        contactInfo: { name: "Priya Sharma" },
      },
      {
        title: "Commercial Shop for Rent",
        price: 25000,
        location: { city: "Rohtak", state: "Haryana" },
        images: [
          "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800",
        ],
        propertyType: "commercial",
        contactInfo: { name: "Amit Singh" },
      },
      {
        title: "4 BHK Villa with Garden",
        price: 8500000,
        location: { city: "Rohtak", state: "Haryana" },
        images: [
          "https://images.unsplash.com/photo-1593696140826-c58b021acf8b?w=800",
        ],
        propertyType: "villa",
        contactInfo: { name: "Vikash Yadav" },
      },
    ];

    // Make it bigger for load-more demo
    const expanded: Property[] = [];
    for (let i = 0; i < 12; i++) {
      base.forEach((b, idx) => {
        expanded.push({
          _id: `mock-${i + 1}-${idx + 1}`,
          title: b.title,
          price: b.price,
          location: b.location,
          images: b.images,
          propertyType: b.propertyType,
          createdAt: new Date(Date.now() - i * 86400000).toISOString(),
          contactInfo: b.contactInfo,
        } as Property);
      });
    }

    return expanded;
  }, []);

  const loadMockPage = useCallback(
    (nextPage: number) => {
      const all = getMockList();
      const start = (nextPage - 1) * PAGE_SIZE;
      const chunk = all.slice(start, start + PAGE_SIZE);

      setProperties((prev) => {
        const map = new Map(prev.map((p) => [p._id, p]));
        chunk.forEach((p) => map.set(p._id, p));
        return Array.from(map.values());
      });

      setHasMore(start + PAGE_SIZE < all.length);
    },
    [getMockList],
  );

  /* --------------------------- Data fetchers --------------------------- */
  const extractList = (json: any): Property[] => {
    if (!json) return [];
    if (Array.isArray(json.data)) return json.data;
    if (Array.isArray(json.data?.properties)) return json.data.properties;
    if (Array.isArray(json.properties)) return json.properties;
    return [];
  };

  const fetchPage = useCallback(
    async (nextPage: number, mode: "initial" | "more") => {
      try {
        mode === "initial" ? setLoading(true) : setLoadingMore(true);

        // Try page-based API
        const res = await apiGet(
          `properties?status=active&limit=${PAGE_SIZE}&page=${nextPage}`,
        );

        if (res?.ok && res?.json?.success) {
          const list = extractList(res.json);

          if (list.length > 0) {
            setProperties((prev) => {
              const map = new Map(prev.map((p) => [p._id, p]));
              list.forEach((p) => map.set(p._id, p));
              return Array.from(map.values());
            });

            // If returned less than PAGE_SIZE, likely no more
            setHasMore(list.length >= PAGE_SIZE);
            setPage(nextPage);
            return;
          }

          // No list returned -> no more
          if (mode === "more") {
            setHasMore(false);
            notify("No more properties to load.");
            return;
          }
        }

        // Fallback mock
        loadMockPage(nextPage);
        setPage(nextPage);
      } catch {
        // Fallback mock
        loadMockPage(nextPage);
        setPage(nextPage);
      } finally {
        mode === "initial" ? setLoading(false) : setLoadingMore(false);
      }
    },
    [apiGet, loadMockPage, notify],
  );

  /* --------------------------- Initial load --------------------------- */
  useEffect(() => {
    fetchPage(1, "initial");
  }, [fetchPage]);

  /* --------------------------- Load more handler --------------------------- */
  const handleLoadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    fetchPage(page + 1, "more");
  }, [fetchPage, hasMore, loadingMore, page]);

  /* --------------------------- Favorites fetch --------------------------- */
  const fetchFavoritesFromServer = useCallback(async () => {
    try {
      const res = await apiGet("favorites/my");
      if (res?.ok && res?.json?.success) {
        const ids = (res.json.data as any[])
          ?.map((row: any) => String(row?.property?._id || row?.propertyId))
          .filter(Boolean);
        setFavorites(Array.from(new Set(ids)));
      } else {
        setFavorites([]);
      }
    } catch (e) {
      console.error("favorites load failed", e);
      setFavorites([]);
    }
  }, [apiGet]);

  useEffect(() => {
    const init = async () => {
      if (token) {
        await fetchFavoritesFromServer();
      } else {
        setFavorites(getLocalFavIds());
      }
      setFavoritesLoaded(true);
    };
    init();
  }, [token, fetchFavoritesFromServer]);

  useEffect(() => {
    if (token) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === "favorites") setFavorites(getLocalFavIds());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [token]);

  /* -------------------- Favorite toggle logic ------------------- */
  const serverToggleFavorite = useCallback(
    async (id: string, makeFav: boolean) => {
      try {
        setFavBusy(id);
        const res = await apiWrite(
          `favorites/${id}`,
          makeFav ? "POST" : "DELETE",
        );

        const msg = (res?.json?.error || res?.json?.message || "")
          .toString()
          .toLowerCase();

        if (res.status === 401) {
          const cur = getLocalFavIds();
          const next = makeFav
            ? Array.from(new Set([id, ...cur]))
            : cur.filter((x) => x !== id);
          setLocalFavIds(next);
          window.dispatchEvent(new Event("favorites:changed"));
          return true;
        }

        if (res.ok || res.status === 200 || res.status === 201) return true;

        if (
          makeFav &&
          (res.status === 400 || res.status === 409) &&
          msg.includes("already")
        )
          return true;

        if (
          !makeFav &&
          (res.status === 400 || res.status === 404) &&
          (msg.includes("not in") || msg.includes("not found"))
        )
          return true;

        console.error("toggle favorite failed", res);
        return false;
      } catch (e) {
        console.error("toggle favorite error", e);
        return false;
      } finally {
        setFavBusy(null);
      }
    },
    [apiWrite],
  );

  const toggleFavorite = useCallback(
    async (id: string) => {
      if (!favoritesLoaded) return;

      if (!token && id.startsWith("mock-")) {
        const isFav = getLocalFavIds().includes(id);
        const next = isFav
          ? getLocalFavIds().filter((x) => x !== id)
          : [id, ...getLocalFavIds()];
        setLocalFavIds(next);
        setFavorites(next);
        window.dispatchEvent(new Event("favorites:changed"));
        notify(isFav ? "Removed from wishlist" : "Saved to this device");
        return;
      }

      const ls = window.localStorage;
      const hasAnyToken =
        token ||
        ls.getItem("token") ||
        ls.getItem("adminToken") ||
        ls.getItem("authToken");

      if (!hasAnyToken) {
        const currentlyFav = getLocalFavIds().includes(id);
        const next = currentlyFav
          ? getLocalFavIds().filter((x) => x !== id)
          : [id, ...getLocalFavIds()];
        setLocalFavIds(next);
        setFavorites(next);
        window.dispatchEvent(new Event("favorites:changed"));
        notify(currentlyFav ? "Removed from wishlist" : "Saved to this device");
        return;
      }

      const currentlyFav = favorites.includes(id);

      setFavorites((prev) =>
        currentlyFav ? prev.filter((x) => x !== id) : [id, ...prev],
      );

      const ok = await serverToggleFavorite(id, !currentlyFav);

      if (!ok) {
        setFavorites((prev) =>
          currentlyFav ? [id, ...prev] : prev.filter((x) => x !== id),
        );
        notify("Something went wrong, please try again.", "error");
        return;
      }

      notify(currentlyFav ? "Removed from wishlist" : "Saved to wishlist");
      window.dispatchEvent(new Event("favorites:changed"));
    },
    [favorites, favoritesLoaded, notify, serverToggleFavorite, token],
  );

  /* -------------------------- Badge helpers --------------------- */
  const isAdminPosted = useCallback((p: Property) => {
    if ((p as any).isAdminPosted === true) return true;

    const possibleFlags = [
      p.ownerRole,
      p.source,
      p.postedBy?.role,
      p.createdBy?.role,
      (p as any).createdByRole,
      (p as any).postedByRole,
    ]
      .filter(Boolean)
      .map((v) => String(v).toLowerCase());

    return possibleFlags.some((v) => v === "admin" || v.includes("admin"));
  }, []);

  const isPremium = useCallback(
    (p: Property) =>
      !isAdminPosted(p) &&
      Boolean(
        p.isPremium ||
          p.premium ||
          (typeof p.plan === "string" &&
            p.plan.toLowerCase().includes("premium")),
      ),
    [isAdminPosted],
  );

  /* -------------------------- UI helpers ------------------------ */
  const formatPrice = useCallback((price: number) => {
    const num = Number(price || 0);
    return `₹ ${num.toLocaleString("en-IN")}`;
  }, []);

  const getTimeAgo = useCallback((iso: string) => {
    const now = new Date();
    const d = new Date(iso);
    const hours = Math.floor((now.getTime() - d.getTime()) / 36e5);
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  }, []);

  const handlePropertyClick = useCallback(
    (p: Property) => navigate(`/properties/${p._id}`),
    [navigate],
  );

  const firstImage = useCallback((p: Property) => {
    const src =
      p.coverImageUrl ||
      (Array.isArray(p.images) && p.images.length > 0
        ? typeof p.images[0] === "string"
          ? (p.images[0] as string)
          : (p.images[0] as any)?.url
        : undefined);

    return src || "/placeholder.png";
  }, []);

  /* ---------------------------- Render -------------------------- */
  if (loading) return <PropertyLoadingSkeleton />;

  return (
    <div className="bg-white">
      <div className="px-4 py-4 max-w-6xl mx-auto">
        <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4">
          Fresh recommendations
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
          {properties.map((property) => {
            const isFav = favorites.includes(property._id);
            const isBusy = favBusy === property._id;
            const imgSrc = firstImage(property);

            return (
              <div
                key={property._id}
                onClick={() => handlePropertyClick(property)}
                className="bg-white border border-gray-200 rounded-lg overflow-hidden cursor-pointer hover:shadow-md transition-all active:scale-95"
              >
                <div className="relative aspect-square md:aspect-[4/3] group bg-gray-100">
                  {imgSrc ? (
                    <img
                      src={imgSrc}
                      alt={property.title}
                      className="w-full h-full object-cover pointer-events-none select-none group-hover:opacity-90 transition-opacity"
                      draggable={false}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/placeholder.png";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                      No Image
                    </div>
                  )}

                  {/* ✅ Badge logic */}
                  {isPremium(property) && (
                    <div className="absolute top-2 left-2 bg-gradient-to-r from-orange-500 to-red-600 text-white px-2 py-1 rounded-md text-[10px] md:text-xs font-bold shadow">
                      [premium]
                    </div>
                  )}

                  {!isPremium(property) && isAdminPosted(property) && (
                    <div className="absolute top-2 left-2 bg-black/80 text-white px-2 py-1 rounded-md text-[10px] md:text-xs font-bold shadow">
                      AP
                    </div>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isBusy) toggleFavorite(property._id);
                    }}
                    disabled={isBusy}
                    className="absolute bottom-2 right-2 md:bottom-3 md:right-3 w-8 h-8 md:w-9 md:h-9 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition disabled:opacity-60"
                    aria-label="favorite"
                    title={isFav ? "Remove from wishlist" : "Save to wishlist"}
                  >
                    <Heart
                      className={`h-4 w-4 ${
                        isFav ? "fill-red-500 text-red-500" : "text-gray-600"
                      }`}
                    />
                  </button>
                </div>

                <div className="p-3 md:p-3.5">
                  <div className="text-base md:text-lg font-bold text-gray-900 mb-1">
                    {formatPrice(property.price)}
                  </div>

                  <h3 className="text-xs md:text-sm text-gray-700 mb-2 line-clamp-2 leading-tight">
                    {property.title}
                  </h3>

                  <div className="flex items-center text-[11px] md:text-xs text-gray-700 mb-2 gap-1">
                    <MapPin className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                    <span className="truncate font-medium">
                      {property.location?.area ||
                        property.location?.sector ||
                        property.location?.colony ||
                        property.location?.city ||
                        "Rohtak"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] md:text-xs text-gray-400 mb-2">
                    <div className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      <span>{getTimeAgo(property.createdAt)}</span>
                    </div>
                    <span className="capitalize px-2 py-0.5 bg-gray-100 rounded">
                      {property.propertyType}
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedProperty(property);
                      setEnquiryModalOpen(true);
                    }}
                    data-testid="enquiry-btn"
                    className="w-full bg-[#C70000] hover:bg-[#A60000] text-white text-[11px] md:text-xs py-2 rounded-md flex items-center justify-center space-x-1 transition-colors"
                  >
                    <Send className="h-3 w-3" />
                    <span>Enquiry Now</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {properties.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>No properties available</p>
          </div>
        )}

        {/* ✅ SAME PAGE LOAD MORE BUTTON */}
        {properties.length > 0 && (
          <div className="mt-6 text-center">
            <button
              onClick={handleLoadMore}
              disabled={!hasMore || loadingMore}
              className={`font-semibold text-sm px-4 py-2 rounded-md transition
                ${
                  !hasMore
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "text-[#C70000] hover:underline"
                }`}
            >
              {loadingMore
                ? "Loading more..."
                : hasMore
                  ? "View all properties"
                  : "No more properties"}
            </button>
          </div>
        )}
      </div>

      {/* Enquiry Modal */}
      {selectedProperty && (
        <EnquiryModal
          isOpen={enquiryModalOpen}
          onClose={() => {
            setEnquiryModalOpen(false);
            setSelectedProperty(null);
          }}
          propertyId={selectedProperty._id}
          propertyTitle={selectedProperty.title}
          ownerName={selectedProperty.contactInfo?.name || "Property Owner"}
        />
      )}
    </div>
  );
}
