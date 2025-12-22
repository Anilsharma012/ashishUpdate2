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

        <div className="px-4 py-6">
          {!selectedSubcategory ? (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Buy Properties</h1>
                <p className="text-gray-600">Choose what you want to buy</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {(subcategories || []).map((subcategory) => (
                  <button
                    key={subcategory._id || subcategory.id || subcategory.slug}
                    onClick={() => handleSubcategoryClick(subcategory)}
                    className="subcat-card bg-white border border-gray-200 rounded-lg p-4 text-left hover:bg-gray-50 transition-colors shadow-sm"
                    data-testid="subcat-card"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 text-lg">{subcategory.name}</h3>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-500 mb-3">{subcategory.description || ""}</p>

                    {Array.isArray(subcategory.miniSubcategories) && subcategory.miniSubcategories.length > 0 ? (
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                        {subcategory.miniSubcategories.length} options
                      </span>
                    ) : null}

                    {subcategory.count ? (
                      <span className="ml-2 text-xs bg-[#C70000] text-white px-2 py-1 rounded-full">
                        {subcategory.count} properties
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="mb-6">
                <button
                  type="button"
                  onClick={() => setSelectedSubcategory(null)}
                  className="inline-flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 mb-4"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>

                <h1 className="text-2xl font-bold text-gray-800 mb-2">{selectedSubcategory.name}</h1>
                <p className="text-gray-600">Select a sub-category</p>

                <button
                  type="button"
                  onClick={() => goToListings(selectedSubcategory.slug)}
                  className="mt-3 inline-flex items-center justify-center rounded-md border border-gray-200 px-3 py-2 text-sm font-medium hover:bg-gray-50"
                >
                  View all {selectedSubcategory.name}
                </button>
              </div>

              {visibleMinis.length ? (
                <div className="grid grid-cols-2 gap-3">
                  {visibleMinis.map((mini) => (
                    <button
                      key={mini._id || mini.id || mini.slug}
                      onClick={() => handleMiniClick(mini)}
                      className="bg-white border border-gray-200 rounded-lg p-4 text-left hover:bg-gray-50 transition-colors shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-900 text-base">{mini.name}</h3>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-500">{mini.description || ""}</p>
                      {mini.count ? (
                        <span className="mt-2 inline-block text-xs bg-[#C70000] text-white px-2 py-1 rounded-full">
                          {mini.count} properties
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-gray-700">
                  No mini-categories found here. You can still view listings.
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
