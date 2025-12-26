import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight } from "lucide-react";
import OLXStyleHeader from "../components/OLXStyleHeader";
import CategoryBar from "../components/CategoryBar";
import BottomNavigation from "../components/BottomNavigation";
import StaticFooter from "../components/StaticFooter";

interface MiniSubcategory {
  id?: string;
  _id?: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  active?: boolean;
  count?: number;
}

interface Subcategory {
  id?: string;
  _id?: string;
  name: string;
  slug: string;
  description?: string;
  count?: number;
  miniSubcategories?: MiniSubcategory[];
}

const safeKebab = (v: string) =>
  (v || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

const isActive = (obj: any) => {
  const v = obj?.isActive ?? obj?.active;
  return typeof v === "boolean" ? v : true;
};

async function readJson(resp: any): Promise<any | null> {
  if (!resp) return null;
  try {
    if (typeof resp.json === "function") return await resp.json();
    return resp.json ?? null;
  } catch {
    return null;
  }
}

async function apiGet(path: string) {
  if (typeof (window as any).api === "function") {
    return await (window as any).api(path);
  }
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
  });
  return { ok: res.ok, status: res.status, json: await res.json().catch(() => null) };
}

export default function Buy() {
  const navigate = useNavigate();

  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [selectedSubcategory, setSelectedSubcategory] = useState<Subcategory | null>(null);
  const [loading, setLoading] = useState(true);

  const fallbackSubcategories: Subcategory[] = useMemo(
    () => [
      {
        id: "residential",
        name: "Residential",
        slug: "residential",
        description: "Houses, flats, and residential properties",
      },
      {
        id: "plots",
        name: "Plots",
        slug: "plots",
        description: "Residential and commercial plots",
      },
      {
        id: "commercial",
        name: "Commercial",
        slug: "commercial",
        description: "Shops, offices, and commercial properties",
      },
      {
        id: "agricultural",
        name: "Agricultural",
        slug: "agricultural",
        description: "Agricultural lands and farming properties",
      },
    ],
    [],
  );

  const normalizeMini = (mini: any): MiniSubcategory => ({
    id: mini?._id?.toString?.() || mini?._id || mini?.id || `${Math.random()}`,
    name: mini?.name ?? "",
    slug: safeKebab(mini?.slug ?? mini?.name ?? ""),
    description: mini?.description ?? "",
    icon: mini?.iconUrl ?? mini?.icon ?? "",
    active: mini?.isActive ?? mini?.active ?? true,
    count: mini?.count ?? 0,
  });

  const normalizeSub = (sub: any): Subcategory => ({
    id: sub?._id?.toString?.() || sub?._id || sub?.id || `${Math.random()}`,
    name: sub?.name ?? "",
    slug: safeKebab(sub?.slug ?? sub?.name ?? ""),
    description: sub?.description ?? "",
    count: sub?.count ?? 0,
    miniSubcategories: Array.isArray(sub?.miniSubcategories)
      ? sub.miniSubcategories
          .map(normalizeMini)
          .filter((m: any) => m?.slug && isActive(m))
      : [],
  });

  const fetchCategoryTree = async () => {
    setLoading(true);

    try {
      // ✅ 1) Best endpoint (returns nested subcategories + miniSubcategories)
      const res = await apiGet(`/categories/buy?withSub=true`);
      const json = await readJson(res);

      let rawSubs: any[] = [];

      if ((res?.ok || res?.status === 200) && json?.success) {
        const d = json?.data;
        if (Array.isArray(d)) {
          const found = d.find((c: any) => safeKebab(c?.slug ?? c?.name) === "buy");
          rawSubs = Array.isArray(found?.subcategories) ? found.subcategories : [];
        } else if (Array.isArray(d?.category?.subcategories)) {
          rawSubs = d.category.subcategories;
        } else if (Array.isArray(d?.subcategories)) {
          rawSubs = d.subcategories;
        }
      }

      // ✅ 2) Fallback endpoint (only subcategories)
      if (!rawSubs?.length) {
        const res2 = await apiGet(`/categories/buy/subcategories`);
        const json2 = await readJson(res2);
        if ((res2?.ok || res2?.status === 200) && json2?.success) {
          rawSubs = Array.isArray(json2?.data) ? json2.data : [];
        }
      }

      const normalized = (Array.isArray(rawSubs) ? rawSubs : [])
        .map(normalizeSub)
        .filter((s: any) => s?.slug && isActive(s))
        .sort((a: any, b: any) => (a?.order ?? 999) - (b?.order ?? 999));

      setSubcategories(normalized.length ? normalized : fallbackSubcategories);
    } catch (e) {
      console.error("Buy: failed to load subcategories", e);
      setSubcategories(fallbackSubcategories);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategoryTree();
    const handler = () => fetchCategoryTree();
    window.addEventListener("categories:updated", handler);
    window.addEventListener("subcategories:updated", handler);
    return () => {
      window.removeEventListener("categories:updated", handler);
      window.removeEventListener("subcategories:updated", handler);
    };
  }, []);

  useEffect(() => {
    if (!selectedSubcategory) return;
    const stillExists = subcategories.some((s) => s.slug === selectedSubcategory.slug);
    if (!stillExists) setSelectedSubcategory(null);
  }, [subcategories, selectedSubcategory]);

  const goToListings = (subSlug: string, miniSlug?: string) => {
    const params = new URLSearchParams();
    params.set("category", "buy");
    params.set("subCategory", subSlug);
    if (miniSlug) params.set("miniSubcategory", miniSlug);
    navigate(`/listings?${params.toString()}`);
  };

  const handleSubcategoryClick = (sub: Subcategory) => {
    const minis = sub.miniSubcategories || [];
    if (minis.length) {
      setSelectedSubcategory(sub);
      return;
    }
    goToListings(sub.slug);
  };

  const handleMiniClick = (mini: MiniSubcategory) => {
    if (!selectedSubcategory) return;
    goToListings(selectedSubcategory.slug, mini.slug);
  };

  const visibleMinis = useMemo(() => {
    const minis = selectedSubcategory?.miniSubcategories || [];
    return minis.filter((m) => m?.slug && (m.active ?? true));
  }, [selectedSubcategory]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <OLXStyleHeader />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-[#C70000] border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading categories...</p>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <OLXStyleHeader />

      <main className="pl-16">
        <CategoryBar />

        <div className="px-4 py-8">
          {!selectedSubcategory ? (
            <>
              <div className="mb-8 pb-6 border-b-2 border-red-200">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Buy Properties</h1>
                <p className="text-gray-600 text-base">Choose what you want to buy</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
                {(subcategories || []).map((subcategory) => (
                  <button
                    key={subcategory._id || subcategory.id || subcategory.slug}
                    onClick={() => handleSubcategoryClick(subcategory)}
                    className="subcat-card group relative overflow-hidden rounded-2xl transition-all duration-300 hover:shadow-lg active:scale-95 border-2 border-red-200 bg-white hover:border-red-400"
                    data-testid="subcat-card"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    <div className="relative p-5 text-left">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-bold text-gray-900 text-base md:text-lg leading-snug flex-1 group-hover:text-red-700 transition-colors">
                          {subcategory.name}
                        </h3>
                        <ChevronRight className="h-5 w-5 text-red-400 group-hover:text-red-600 transition-colors flex-shrink-0 ml-2" />
                      </div>

                      {subcategory.description && (
                        <p className="text-xs md:text-sm text-gray-600 mb-3 line-clamp-2">
                          {subcategory.description}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2">
                        {Array.isArray(subcategory.miniSubcategories) && subcategory.miniSubcategories.length > 0 ? (
                          <span className="inline-block text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full font-semibold">
                            {subcategory.miniSubcategories.length} options
                          </span>
                        ) : null}

                        {subcategory.count ? (
                          <span className="inline-block text-xs bg-red-600 text-white px-3 py-1 rounded-full font-bold">
                            {subcategory.count} properties
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="mb-8 pb-6">
                <button
                  type="button"
                  onClick={() => setSelectedSubcategory(null)}
                  className="inline-flex items-center gap-2 text-base font-semibold text-red-600 hover:text-red-700 mb-4 transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                  Back
                </button>

                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">{selectedSubcategory.name}</h1>
                <p className="text-gray-600 text-base mb-4">Select a subcategory</p>

                <button
                  type="button"
                  onClick={() => goToListings(selectedSubcategory.slug)}
                  className="inline-flex items-center justify-center rounded-xl border-2 border-red-600 bg-red-600 text-white px-6 py-3 text-base font-semibold hover:bg-red-700 hover:border-red-700 transition-all active:scale-95"
                >
                  View all {selectedSubcategory.name}
                </button>
              </div>

              {visibleMinis.length ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
                  {visibleMinis.map((mini) => (
                    <button
                      key={mini._id || mini.id || mini.slug}
                      onClick={() => handleMiniClick(mini)}
                      className="group relative overflow-hidden rounded-2xl transition-all duration-300 hover:shadow-lg active:scale-95 border-2 border-red-200 bg-white hover:border-red-400"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                      <div className="relative p-5 text-left">
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="font-bold text-gray-900 text-base leading-snug flex-1 group-hover:text-red-700 transition-colors">
                            {mini.name}
                          </h3>
                          <ChevronRight className="h-5 w-5 text-red-400 group-hover:text-red-600 transition-colors flex-shrink-0 ml-2" />
                        </div>

                        {mini.description && (
                          <p className="text-xs md:text-sm text-gray-600 mb-3 line-clamp-2">
                            {mini.description}
                          </p>
                        )}

                        {mini.count ? (
                          <span className="inline-block text-xs bg-red-600 text-white px-3 py-1 rounded-full font-bold">
                            {mini.count} properties
                          </span>
                        ) : null}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="bg-gradient-to-br from-red-50 to-white border-2 border-red-200 rounded-2xl p-6 text-center">
                  <p className="text-gray-700 font-medium">No subcategories found here</p>
                  <p className="text-sm text-gray-600 mt-1">You can still view all listings in this category</p>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <BottomNavigation />
      <StaticFooter />
    </div>
  );
}
