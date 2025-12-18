import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Loader2 } from "lucide-react";
import OLXStyleHeader from "../components/OLXStyleHeader";
import CategoryBar from "../components/CategoryBar";
import BottomNavigation from "../components/BottomNavigation";
import StaticFooter from "../components/StaticFooter";

interface MiniSubcategory {
  _id?: string;
  id?: string; // ✅ fallback items use `id`
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  count?: number;
}

interface Subcategory {
  _id?: string;
  id?: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  active?: boolean;
  isActive?: boolean;
  miniSubcategories?: MiniSubcategory[];
}

export default function Agricultural() {
  const navigate = useNavigate();
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [currentSubcategorySlug, setCurrentSubcategorySlug] = useState("");
  const [miniSubcategories, setMiniSubcategories] = useState<MiniSubcategory[]>(
    [],
  );
  const [loading, setLoading] = useState(true);

  // Load category (agricultural) + subcategories from API
  useEffect(() => {
    const fetchAgriculturalCategory = async () => {
      try {
        setLoading(true);

        // Prefer by slug endpoint if available
        const catResponse = await fetch(
          "/api/admin/categories/slug/agricultural",
        );
        if (catResponse.ok) {
          const catData = await catResponse.json();
          if (catData?.success && catData?.data) {
            const category = Array.isArray(catData.data)
              ? catData.data[0]
              : catData.data;

            // ✅ If embedded subcategories exist
            if (category?.subcategories?.length) {
              const subs: Subcategory[] = category.subcategories;
              setSubcategories(subs);

              const firstSub = subs[0];
              setCurrentSubcategorySlug(firstSub?.slug || "");

              // If embedded minis exist
              if (firstSub?.miniSubcategories?.length) {
                setMiniSubcategories(firstSub.miniSubcategories);
              } else {
                setMiniSubcategories([]);
              }
            } else {
              // fallback: fetch subcategories separately
              setSubcategories([]);
              setMiniSubcategories([]);
            }
          }
        } else {
          // fallback: fetch categories list and pick agricultural
          const response = await fetch("/api/admin/categories");
          const data = await response.json();
          if (data?.success && Array.isArray(data.data)) {
            const agricultural = data.data.find(
              (c: any) => String(c.slug).toLowerCase() === "agricultural",
            );
            if (agricultural?.subcategories?.length) {
              setSubcategories(agricultural.subcategories);
              const firstSub = agricultural.subcategories[0];
              setCurrentSubcategorySlug(firstSub?.slug || "");
              setMiniSubcategories(firstSub?.miniSubcategories || []);
            }
          }
        }
      } catch (e) {
        console.error("Failed to load agricultural categories:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchAgriculturalCategory();
  }, []);

  // When subcategory changes, fetch mini-subcategories (with counts)
  useEffect(() => {
    const fetchMinis = async () => {
      try {
        if (!currentSubcategorySlug) return;

        setLoading(true);

        // find subcategory object (from loaded list)
        const sub = subcategories.find(
          (s) => String(s.slug).toLowerCase() === currentSubcategorySlug,
        );

        // If we already have embedded minis, keep them
        if (sub?.miniSubcategories?.length) {
          setMiniSubcategories(sub.miniSubcategories);
          return;
        }

        // Otherwise fetch by subcategoryId
        const subId = sub?._id || sub?.id;
        if (!subId) {
          setMiniSubcategories([]);
          return;
        }

        const res = await fetch(
          `/api/admin/mini-subcategories/${subId}/with-counts`,
        );
        const data = await res.json();

        if (data?.success && Array.isArray(data.data)) {
          setMiniSubcategories(data.data);
        } else {
          setMiniSubcategories([]);
        }
      } catch (e) {
        console.error("Failed to load mini-subcategories:", e);
        setMiniSubcategories([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMinis();
  }, [currentSubcategorySlug, subcategories]);

  const handleSubcategoryClick = (slug: string) => {
    setCurrentSubcategorySlug(slug);
  };

  const handleMiniClick = (mini: MiniSubcategory) => {
    // ✅ IMPORTANT: pass category context so the next page can filter correctly
    navigate(`/agricultural/${mini.slug}?category=agricultural`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <OLXStyleHeader />
      <CategoryBar />

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Agricultural</h1>
            <p className="text-gray-600 mt-1">
              Browse agricultural listings by category
            </p>
          </div>
        </div>

        {/* Subcategories chips */}
        {subcategories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {subcategories.map((sub) => (
              <button
                key={sub._id || sub.id || sub.slug}
                onClick={() => handleSubcategoryClick(sub.slug)}
                className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
                  currentSubcategorySlug === sub.slug
                    ? "bg-red-600 text-white border-red-600"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
              >
                {sub.name}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-red-600" />
          </div>
        ) : miniSubcategories.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {miniSubcategories.map((mini) => (
              <div
                key={mini._id || mini.id || mini.slug}
                onClick={() => handleMiniClick(mini)}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-lg transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-lg">
                      {mini.name}
                    </h3>
                    {mini.description && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {mini.description}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>

                {typeof mini.count === "number" && (
                  <div className="mt-3 text-sm text-gray-700">
                    <span className="font-semibold">{mini.count}</span>{" "}
                    {mini.count === 1 ? "property" : "properties"}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No Listings Found
            </h2>
            <p className="text-gray-600">
              There are no agricultural listings in this category yet.
            </p>
          </div>
        )}
      </div>

      <StaticFooter />
      <BottomNavigation />
    </div>
  );
}
