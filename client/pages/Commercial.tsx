import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Loader2 } from "lucide-react";
import OLXStyleHeader from "../components/OLXStyleHeader";
import CategoryBar from "../components/CategoryBar";
import BottomNavigation from "../components/BottomNavigation";
import StaticFooter from "../components/StaticFooter";

interface MiniSubcategory {
  _id?: string;
  id?: string; // ✅ fallback minis me id use ho raha tha
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
  count?: number;
}

export default function Commercial() {
  const navigate = useNavigate();
  const [miniSubcategories, setMiniSubcategories] = useState<MiniSubcategory[]>(
    [],
  );
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [useFallback, setUseFallback] = useState(false);

  // ✅ store which subcategory's minis are being shown (so click can pass correct subCategory)
  const [activeSubcategorySlug, setActiveSubcategorySlug] = useState("");

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // ✅ Use local flags so state-delay doesn't trigger fallback incorrectly
      let minisLoaded = false;
      let localActiveSubSlug = "";

      // First try to fetch the commercial category with subcategories
      const catResponse = await fetch(
        "/api/categories/commercial?withSub=true",
      );

      if (catResponse.ok) {
        const catData = await catResponse.json();
        if (catData.success && catData.data) {
          const category = Array.isArray(catData.data)
            ? catData.data[0]
            : catData.data;

          // If category has embedded subcategories, use the first one
          if (
            category.subcategories &&
            Array.isArray(category.subcategories) &&
            category.subcategories.length > 0
          ) {
            const firstSubcategory = category.subcategories[0];
            setSubcategories(category.subcategories);

            // Save active subcategory slug so we can pass it to listings
            localActiveSubSlug =
              firstSubcategory.slug ||
              String(firstSubcategory.name || "")
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, "")
                .replace(/\s+/g, "-")
                .replace(/-+/g, "-")
                .trim();

            setActiveSubcategorySlug(localActiveSubSlug);

            // Now fetch mini-subcategories for the first subcategory
            if (firstSubcategory._id || firstSubcategory.id) {
              const subId = firstSubcategory._id || firstSubcategory.id;
              const ok = await fetchMiniSubcategoriesForSubcategory(subId);
              minisLoaded = ok;
            }
          }
        }
      }

      // If we couldn't fetch mini-subcategories, use fallback with property counts
      if (!minisLoaded && !useFallback) {
        setUseFallback(true);
        const fallbackMinis = getFallbackMiniSubcategories();

        // Fetch property counts for fallback subcategories
        const minisWithCounts = await Promise.all(
          fallbackMinis.map(async (mini) => {
            try {
              const countParams = new URLSearchParams();
              countParams.append("propertyType", "commercial");

              // fallback minis ka slug "subCategory" treat ho raha hai
              countParams.append("subCategory", mini.slug);
              countParams.append("limit", "1");

              const countResponse = await fetch(
                `/api/properties?${countParams.toString()}`,
              );

              if (countResponse.ok) {
                const countData = await countResponse.json();
                if (countData?.success && countData?.data?.pagination) {
                  return {
                    ...mini,
                    count: countData.data.pagination.total ?? 0,
                  };
                }
              }
              return mini;
            } catch (error) {
              console.error(`Error fetching count for ${mini.slug}:`, error);
              return mini;
            }
          }),
        );

        setMiniSubcategories(minisWithCounts);
      }
    } catch (error) {
      console.error("Error fetching commercial data:", error);
      setUseFallback(true);

      const fallbackMinis = getFallbackMiniSubcategories();
      // Fetch property counts for fallback subcategories
      const minisWithCounts = await Promise.all(
        fallbackMinis.map(async (mini) => {
          try {
            const countParams = new URLSearchParams();
            countParams.append("propertyType", "commercial");
            countParams.append("subCategory", mini.slug);
            countParams.append("limit", "1");

            const countResponse = await fetch(
              `/api/properties?${countParams.toString()}`,
            );
            if (countResponse.ok) {
              const countData = await countResponse.json();
              if (countData?.success && countData?.data?.pagination) {
                return { ...mini, count: countData.data.pagination.total ?? 0 };
              }
            }
            return mini;
          } catch (error) {
            console.error(`Error fetching count for ${mini.slug}:`, error);
            return mini;
          }
        }),
      );
      setMiniSubcategories(minisWithCounts);
    } finally {
      setLoading(false);
    }
  };

  const fetchMiniSubcategoriesForSubcategory = async (
    subcategoryId: string,
  ): Promise<boolean> => {
    try {
      // ✅ FIX: Public route (admin route yaha use nahi karna)
      const response = await fetch(
        `/api/mini-subcategories/${subcategoryId}/with-counts`,
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          // optional active filtering (agar flags available ho)
          const cleaned = data.data.filter((m: any) => {
            const a = m.active;
            const ia = m.isActive;
            return a !== false && ia !== false;
          });

          setMiniSubcategories(cleaned);
          return true;
        }
      }
    } catch (error) {
      console.error("Error fetching mini-subcategories:", error);
    }
    return false;
  };

  /**
   * Fallback mini-subcategories for commercial page
   */
  const getFallbackMiniSubcategories = (): MiniSubcategory[] => [
    {
      id: "shop",
      name: "Shop",
      slug: "shop",
      description: "Retail shops and storefronts",
      count: 0,
    },
    {
      id: "office",
      name: "Office Space",
      slug: "office",
      description: "Office spaces and suites",
      count: 0,
    },
    {
      id: "showroom",
      name: "Showroom",
      slug: "showroom",
      description: "Showrooms and display spaces",
      count: 0,
    },
    {
      id: "warehouse",
      name: "Warehouse",
      slug: "warehouse",
      description: "Warehouses and storage spaces",
      count: 0,
    },
    {
      id: "factory",
      name: "Factory",
      slug: "factory",
      description: "Industrial factories and units",
      count: 0,
    },
    {
      id: "restaurant-space",
      name: "Restaurant Space",
      slug: "restaurant-space",
      description: "Food and beverage spaces",
      count: 0,
    },
  ];

  const handleMiniClick = (mini: MiniSubcategory) => {
    // ✅ FIX: mini click pe direct listings with correct filters
    const params = new URLSearchParams();
    params.append("category", "commercial");

    // if we are NOT in fallback mode, minis belong to a specific subcategory (first subcategory)
    // so pass that subCategory too, otherwise mini filter alone may not match your save logic
    if (!useFallback && activeSubcategorySlug) {
      params.append("subCategory", activeSubcategorySlug);
      params.append("miniSubcategory", mini.slug);
    } else {
      // fallback minis are treated as subCategory
      params.append("subCategory", mini.slug);
    }

    navigate(`/listings?${params.toString()}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <OLXStyleHeader />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-red-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading commercial properties...</p>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <OLXStyleHeader />

      <main className="pb-16">
        <CategoryBar />

        <div className="px-4 py-8">
          {/* Header */}
          <div className="mb-8 pb-6 border-b-2 border-red-200">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Commercial Properties
            </h1>
            <p className="text-gray-600 text-base">
              Find commercial spaces for your business - Shops, Offices,
              Warehouses & more
            </p>
          </div>

          {/* Mini-subcategories Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
            {miniSubcategories.map((mini) => (
              <button
                key={mini._id || mini.slug}
                onClick={() => handleMiniClick(mini)}
                className="mini-subcat-card group relative overflow-hidden rounded-2xl transition-all duration-300 hover:shadow-lg active:scale-95 border-2 border-red-200 bg-white hover:border-red-400 text-left"
                data-testid="mini-subcat-card"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div className="relative p-5">
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

                  {/* Property count badge */}
                  <span className="inline-block text-xs bg-red-600 text-white px-3 py-1 rounded-full font-bold">
                    {mini.count ?? 0}{" "}
                    {(mini.count ?? 0) === 1 ? "property" : "properties"}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {miniSubcategories.length === 0 && (
            <div className="bg-gradient-to-br from-red-50 to-white border-2 border-red-200 rounded-2xl p-8 text-center">
              <p className="text-gray-700 font-medium">
                No commercial properties available yet
              </p>
            </div>
          )}

          {/* Note about auto-categorization */}
          {miniSubcategories.length > 0 && (
            <div className="mt-8 p-4 bg-red-50 border-2 border-red-200 rounded-2xl">
              <p className="text-sm text-red-900">
                💡 <strong>Auto-Updated Listings:</strong> New commercial
                properties are automatically displayed here after admin
                approval.
              </p>
            </div>
          )}
        </div>
      </main>

      <BottomNavigation />
      <StaticFooter />
    </div>
  );
}
