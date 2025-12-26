import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import OLXStyleHeader from "../components/OLXStyleHeader";
import CategoryBar from "../components/CategoryBar";
import BottomNavigation from "../components/BottomNavigation";
import StaticFooter from "../components/StaticFooter";

interface Subcategory {
  id?: string;
  _id?: string;
  name: string;
  slug: string;
  description: string;
  count?: number;
}

export default function Lease() {
  const navigate = useNavigate();
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubcategories();
  }, []);

  const getFallbackSubcategories = (): Subcategory[] => [
    {
      id: "office",
      name: "Office Space",
      slug: "office",
      description: "Commercial office space",
      count: 0,
    },
    {
      id: "retail",
      name: "Retail Space",
      slug: "retail",
      description: "Shops and showrooms",
      count: 0,
    },
    {
      id: "warehouse",
      name: "Warehouse",
      slug: "warehouse",
      description: "Storage and warehouse",
      count: 0,
    },
    {
      id: "industrial",
      name: "Industrial",
      slug: "industrial",
      description: "Industrial properties",
      count: 0,
    },
    {
      id: "restaurant",
      name: "Restaurant Space",
      slug: "restaurant",
      description: "Restaurant and food space",
      count: 0,
    },
    {
      id: "hotel",
      name: "Hotel/Lodge",
      slug: "hotel",
      description: "Hospitality properties",
      count: 0,
    },
  ];

  const fetchSubcategories = async () => {
    try {
      setLoading(true);
      const apiResponse = await (window as any).api(
        "/categories/lease/subcategories",
      );
      const data = apiResponse?.json || {};

      let fetchedSubcategories: Subcategory[] = [];

      if (apiResponse?.ok && data?.success && Array.isArray(data.data)) {
        fetchedSubcategories = data.data;
      } else {
        console.warn(
          "Subcategories API non-OK; using fallback",
          apiResponse?.status,
          data?.error,
        );
        fetchedSubcategories = getFallbackSubcategories();
      }

      // Map slug to propertyType for API query
      const getPropertyTypeForSlug = (
        slug: string,
      ): { propertyType?: string; subCategory?: string } => {
        const slugLower = slug.toLowerCase();

        if (
          slugLower === "commercial" ||
          [
            "office",
            "retail",
            "warehouse",
            "industrial",
            "restaurant",
            "hotel",
          ].includes(slugLower)
        ) {
          return { propertyType: "commercial" };
        }

        return { subCategory: slugLower };
      };

      // Fetch live property counts for each subcategory
      const subcategoriesWithCounts = await Promise.all(
        fetchedSubcategories.map(async (sub) => {
          try {
            // Map slug to propertyType
            const mapping = getPropertyTypeForSlug(sub.slug);

            // Build query params
            const params = new URLSearchParams();
            params.append("priceType", "lease");
            params.append("limit", "1");

            if (mapping.propertyType) {
              params.append("propertyType", mapping.propertyType);
            }
            if (mapping.subCategory) {
              params.append("subCategory", mapping.subCategory);
            }

            const countResponse = await (window as any).api(
              `/properties?${params}`,
            );

            let count = sub.count || 0;
            if (
              countResponse.ok &&
              countResponse.json?.success &&
              countResponse.json.data?.pagination
            ) {
              count = countResponse.json.data.pagination.total || 0;
            }

            return { ...sub, count };
          } catch (error) {
            console.error(
              `Error fetching count for subcategory ${sub.slug}:`,
              error,
            );
            return sub;
          }
        }),
      );

      setSubcategories(subcategoriesWithCounts);
    } catch (error) {
      console.warn("Subcategories API failed, using fallback:", error);
      setSubcategories(getFallbackSubcategories());
    } finally {
      setLoading(false);
    }
  };

  const handleSubcategoryClick = (subcategory: Subcategory) => {
    // For special categories that have their own dedicated pages with mini-subcategories
    const specialCategories: Record<string, string> = {
      commercial: "/commercial",
      agricultural: "/agricultural",
      "co-living": "/co-living",
      "pg-co-living": "/pg-co-living",
    };

    if (specialCategories[subcategory.slug]) {
      navigate(specialCategories[subcategory.slug]);
    } else {
      navigate(`/lease/${subcategory.slug}?category=lease&priceType=lease`);
    }
  };

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

      <main className="pb-16">
        <CategoryBar />

        <div className="px-4 py-8">
          <div className="mb-8 pb-6 border-b-2 border-red-200">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Lease Properties
            </h1>
            <p className="text-gray-600 text-base">
              Choose a property type for lease
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
            {subcategories.map((subcategory) => (
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

                  {subcategory.count ? (
                    <span className="inline-block text-xs bg-red-600 text-white px-3 py-1 rounded-full font-bold">
                      {subcategory.count} properties
                    </span>
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>

      <BottomNavigation />
      <StaticFooter />
    </div>
  );
}
