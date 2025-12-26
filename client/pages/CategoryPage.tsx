import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight } from "lucide-react";

import OLXStyleHeader from "../components/OLXStyleHeader";
import CategoryBar from "../components/CategoryBar";
import BottomNavigation from "../components/BottomNavigation";
import StaticFooter from "../components/StaticFooter";
import { createApiUrl } from "../lib/api";

type MiniSubcategory = {
  id?: string;
  _id?: string;
  name: string;
  slug: string;
  description?: string;
  iconUrl?: string;
  icon?: string;
  imageUrl?: string;
  isActive?: boolean;
  active?: boolean;
  count?: number;
};

type Subcategory = {
  id?: string;
  _id?: string;
  name: string;
  slug: string;
  description?: string;
  iconUrl?: string;
  icon?: string;
  imageUrl?: string;
  isActive?: boolean;
  active?: boolean;
  count?: number;
  miniSubcategories?: MiniSubcategory[];
};

type CategoryResponse = {
  success: boolean;
  data?: any;
  error?: string;
};

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

const safeJson = async <T,>(res: Response): Promise<T | null> => {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
};

export default function CategoryPage(props: {
  categoryName: string;
  categorySlug: string;
  categoryIcon?: string;
  categoryDescription?: string;
}) {
  const navigate = useNavigate();

  const { categoryName, categorySlug, categoryIcon, categoryDescription } = props;

  const [loading, setLoading] = useState(true);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [view, setView] = useState<"sub" | "mini">("sub");
  const [selectedSub, setSelectedSub] = useState<Subcategory | null>(null);
  const [miniLoading, setMiniLoading] = useState(false);

  const normalizedCategorySlug = useMemo(
    () => safeKebab(categorySlug),
    [categorySlug],
  );

  const normalizeMini = (mini: any): MiniSubcategory => ({
    id: mini?._id?.toString?.() || mini?._id || mini?.id || `${Math.random()}`,
    _id: mini?._id,
    name: mini?.name ?? "",
    slug: safeKebab(mini?.slug ?? mini?.name ?? ""),
    description: mini?.description ?? "",
    iconUrl: mini?.iconUrl ?? mini?.icon ?? "",
    imageUrl: mini?.imageUrl ?? "",
    isActive: mini?.isActive,
    active: mini?.active,
    count: mini?.count ?? 0,
  });

  const normalizeSub = (sub: any): Subcategory => ({
    id: sub?._id?.toString?.() || sub?._id || sub?.id || `${Math.random()}`,
    _id: sub?._id,
    name: sub?.name ?? "",
    slug: safeKebab(sub?.slug ?? sub?.name ?? ""),
    description: sub?.description ?? "",
    iconUrl: sub?.iconUrl ?? sub?.icon ?? "",
    imageUrl: sub?.imageUrl ?? "",
    isActive: sub?.isActive,
    active: sub?.active,
    count: sub?.count ?? 0,
    miniSubcategories: Array.isArray(sub?.miniSubcategories)
      ? sub.miniSubcategories.map(normalizeMini).filter((m: any) => m?.slug && isActive(m))
      : [],
  });

  const fetchCategoryTree = async () => {
    setLoading(true);
    try {
      let rawSubs: any[] = [];

      // ✅ 1) Best: /api/categories/:slug?withSub=true
      const res1 = await fetch(
        createApiUrl(`categories/${normalizedCategorySlug}?withSub=true`),
        { headers: { "Content-Type": "application/json" } },
      );
      const json1 = await safeJson<CategoryResponse>(res1);

      if (res1.ok && json1?.success) {
        const d = json1?.data;

        // many backends return {data: {...category}}
        if (Array.isArray(d?.subcategories)) rawSubs = d.subcategories;

        // sometimes returns {data: {category:{subcategories}}}
        if (!rawSubs.length && Array.isArray(d?.category?.subcategories)) {
          rawSubs = d.category.subcategories;
        }

        // sometimes returns array of categories
        if (!rawSubs.length && Array.isArray(d)) {
          const found = d.find(
            (c: any) => safeKebab(c?.slug ?? c?.name) === normalizedCategorySlug,
          );
          rawSubs = Array.isArray(found?.subcategories) ? found.subcategories : [];
        }
      }

      // ✅ 2) Fallback: /api/categories/:slug
      if (!rawSubs.length) {
        const res2 = await fetch(createApiUrl(`categories/${normalizedCategorySlug}`), {
          headers: { "Content-Type": "application/json" },
        });
        const json2 = await safeJson<CategoryResponse>(res2);
        if (res2.ok && json2?.success) {
          const d = json2?.data;
          if (Array.isArray(d?.subcategories)) rawSubs = d.subcategories;
          if (!rawSubs.length && Array.isArray(d?.category?.subcategories)) rawSubs = d.category.subcategories;
        }
      }

      // ✅ 3) Last fallback: /api/categories/:slug/subcategories
      if (!rawSubs.length) {
        const res3 = await fetch(
          createApiUrl(`categories/${normalizedCategorySlug}/subcategories`),
          { headers: { "Content-Type": "application/json" } },
        );
        const json3 = await safeJson<CategoryResponse>(res3);
        if (res3.ok && json3?.success) {
          rawSubs = Array.isArray(json3?.data) ? (json3?.data as any[]) : [];
        }
      }

      const normalized = (Array.isArray(rawSubs) ? rawSubs : [])
        .map(normalizeSub)
        .filter((s: any) => s?.slug && isActive(s));

      setSubcategories(normalized);
    } catch (e) {
      console.error("CategoryPage load error:", e);
      setSubcategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategoryTree();
    // live refresh hooks (optional)
    const handler = () => fetchCategoryTree();
    window.addEventListener("categories:updated", handler);
    window.addEventListener("subcategories:updated", handler);
    return () => {
      window.removeEventListener("categories:updated", handler);
      window.removeEventListener("subcategories:updated", handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedCategorySlug]);

  const goToListings = (subSlug: string, miniSlug?: string) => {
    const params = new URLSearchParams();
    params.set("category", normalizedCategorySlug);
    params.set("subCategory", subSlug);
    if (miniSlug) params.set("miniSubcategory", miniSlug);

    // ✅ common listings page
    navigate(`/listings?${params.toString()}`);
  };

  const openSub = async (sub: Subcategory) => {
    const minis = sub.miniSubcategories || [];
    if (minis.length) {
      setSelectedSub(sub);
      setView("mini");

      // best-effort mini counts loading could be added later
      setMiniLoading(false);
      return;
    }
    goToListings(sub.slug);
  };

  const openMini = (mini: MiniSubcategory) => {
    if (!selectedSub) return;
    goToListings(selectedSub.slug, mini.slug);
  };

  const backToSubs = () => {
    setView("sub");
    setSelectedSub(null);
  };

  const visibleMinis = useMemo(() => {
    const minis = selectedSub?.miniSubcategories || [];
    return minis.filter((m) => m?.slug && isActive(m));
  }, [selectedSub]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="relative z-50">
          <OLXStyleHeader />
        </div>

        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-[#C70000] border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600">Loading categories...</p>
          </div>
        </div>

        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="relative z-50">
        <OLXStyleHeader />
      </div>

      <main className="relative z-0 pb-20">
        <div className="sticky top-0 z-40 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 border-b border-gray-100">
          <CategoryBar />
        </div>

        <div className="px-4 py-6">
          {view === "sub" && (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">
                  <span>{categoryIcon ?? "📁"}</span>
                  <span>{categoryName}</span>
                </h1>
                <p className="text-gray-600">
                  {categoryDescription ?? "Choose a subcategory"}
                </p>
              </div>

              {subcategories.length ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {subcategories.map((sub) => (
                    <button
                      key={sub._id || sub.id || sub.slug}
                      onClick={() => openSub(sub)}
                      className="group relative overflow-hidden rounded-2xl transition-all duration-300 hover:shadow-lg active:scale-95 border-2 border-red-200 bg-white hover:border-red-400"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                      <div className="relative p-5 text-left">
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="font-bold text-gray-900 text-base leading-snug flex-1 group-hover:text-red-700 transition-colors">
                            {sub.name}
                          </h3>
                          <ChevronRight className="h-5 w-5 text-red-400 group-hover:text-red-600 transition-colors flex-shrink-0 ml-2" />
                        </div>

                        {sub.description ? (
                          <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                            {sub.description}
                          </p>
                        ) : null}

                        <div className="flex flex-wrap gap-2">
                          {Array.isArray(sub.miniSubcategories) &&
                          sub.miniSubcategories.length > 0 ? (
                            <span className="inline-block text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full font-semibold">
                              {sub.miniSubcategories.length} options
                            </span>
                          ) : null}

                          {typeof sub.count === "number" && sub.count > 0 ? (
                            <span className="inline-block text-xs bg-red-600 text-white px-3 py-1 rounded-full font-bold">
                              {sub.count} properties
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="bg-gradient-to-br from-red-50 to-white border-2 border-red-200 rounded-2xl p-6 text-center">
                  <p className="text-gray-700 font-medium">No subcategories found</p>
                  <p className="text-sm text-gray-600 mt-1">Please contact admin to add categories</p>
                </div>
              )}
            </>
          )}

          {view === "mini" && selectedSub && (
            <>
              <div className="mb-4 flex items-center gap-2">
                <button
                  onClick={backToSubs}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-black"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
              </div>

              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {selectedSub.name}
                </h2>
                <p className="text-gray-600 text-sm">
                  Select a mini-category
                </p>

                <button
                  type="button"
                  onClick={() => goToListings(selectedSub.slug)}
                  className="mt-3 inline-flex items-center justify-center rounded-md border border-gray-200 px-3 py-2 text-sm font-medium hover:bg-gray-50"
                >
                  View all {selectedSub.name}
                </button>
              </div>

              {miniLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="text-center">
                    <div className="animate-spin w-7 h-7 border-2 border-red-600 border-t-transparent rounded-full mx-auto mb-3" />
                    <p className="text-gray-600 text-sm">Loading mini-categories...</p>
                  </div>
                </div>
              ) : visibleMinis.length ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {visibleMinis.map((mini) => (
                    <button
                      key={mini._id || mini.id || mini.slug}
                      onClick={() => openMini(mini)}
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

                        {mini.description ? (
                          <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                            {mini.description}
                          </p>
                        ) : null}

                        {typeof mini.count === "number" && mini.count > 0 ? (
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
                  <p className="text-gray-700 font-medium">No mini-categories found here</p>
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
