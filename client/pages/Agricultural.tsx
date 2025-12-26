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

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8 pb-6 border-b-2 border-red-200">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Agricultural</h1>
          <p className="text-gray-600 text-base">
            Browse agricultural listings by category
          </p>
        </div>

        {/* Subcategories chips */}
        {subcategories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {subcategories.map((sub) => (
              <button
                key={sub._id || sub.id || sub.slug}
                onClick={() => handleSubcategoryClick(sub.slug)}
                className={`px-4 py-2 rounded-full border-2 text-sm font-semibold transition-all duration-300 ${
                  currentSubcategorySlug === sub.slug
                    ? "bg-red-600 text-white border-red-600"
                    : "bg-white text-gray-700 border-red-200 hover:border-red-400 hover:bg-red-50"
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {miniSubcategories.map((mini) => (
              <button
                key={mini._id || mini.id || mini.slug}
                onClick={() => handleMiniClick(mini)}
                className="group relative overflow-hidden rounded-2xl transition-all duration-300 hover:shadow-lg active:scale-95 border-2 border-red-200 bg-white hover:border-red-400 text-left"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div className="relative p-5">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-bold text-gray-900 text-base leading-snug flex-1 group-hover:text-red-700 transition-colors">
                      {mini.name}
                    </h3>
                    <ChevronRight className="w-5 h-5 text-red-400 group-hover:text-red-600 transition-colors flex-shrink-0 ml-2" />
                  </div>

                  {mini.description && (
                    <p className="text-xs md:text-sm text-gray-600 mb-3 line-clamp-2">
                      {mini.description}
                    </p>
                  )}

                  {typeof mini.count === "number" && mini.count > 0 && (
                    <span className="inline-block text-xs bg-red-600 text-white px-3 py-1 rounded-full font-bold">
                      {mini.count} {mini.count === 1 ? "property" : "properties"}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="bg-gradient-to-br from-red-50 to-white border-2 border-red-200 rounded-2xl p-8 text-center">
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
