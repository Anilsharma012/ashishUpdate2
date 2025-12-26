import React, { useEffect, useState } from "react";
import {
  Car,
  Building2,
  Smartphone,
  Briefcase,
  Shirt,
  Bike,
  Tv,
  Truck,
  Sofa,
  Heart,
  MapPin,
} from "lucide-react";
import { withApiErrorBoundary } from "./ApiErrorBoundary";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";

/* ---------- Icons map (fallback to Building2) ---------- */
const categoryIcons: Record<string, any> = {
  Cars: Car,
  Properties: Building2,
  Mobiles: Smartphone,
  Jobs: Briefcase,
  Fashion: Shirt,
  Bikes: Bike,
  "Electronics & Appliances": Tv,
  "Commercial Vehicles & Spares": Truck,
  Furniture: Sofa,
  Pets: Heart,
  Maps: MapPin,
};

/* ---------- Types ---------- */
interface Category {
  _id?: string;
  name: string;
  slug: string;
  icon?: string;
  description?: string;
  subcategories?: any[];
  order?: number;
  active?: boolean;
}

/* ---------- Helpers ---------- */
const norm = (v?: string) =>
  (v || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "");

const isMatch = (cat: Category, ...candidates: string[]) => {
  const n = norm(cat.slug) || norm(cat.name);
  return candidates.map(norm).includes(n);
};

/** Special routes for specific category names/slugs */
const ROUTE_OVERRIDES: Record<string, string> = {
  "new-projects": "/new-projects",
  maps: "/maps",
  buy: "/buy",

  sell: "/post-property",
  rent: "/rent",
  lease: "/lease",
  "co-living": "/co-living",
  agricultural: "/agricultural",
  commercial: "/commercial",
  "other-services": "/other-services/other-services",
};

/** Ye 3 categories hamesha show honi chahiye */
const MUST_HAVE_CATEGORIES: { name: string; slug: string }[] = [
  { name: "Other Services", slug: "other-services" },
  { name: "Maps", slug: "maps" },
  { name: "New Projects", slug: "new-projects" },
];

/* ---------- Component ---------- */
function OLXStyleCategories() {
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState<Category | null>(null);

  const mapFromApi = (raw: any): Category => ({
    _id: raw?._id,
    name: raw?.name ?? "",
    slug: raw?.slug ?? "",
    icon: raw?.iconUrl ?? raw?.icon ?? "",
    description: raw?.description ?? "",
    subcategories: raw?.subcategories ?? [],
    order: raw?.sortOrder ?? raw?.order ?? 999,
    active: raw?.isActive ?? raw?.active ?? true,
  });

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await api.get("categories?active=true&withSub=true");
      const data = res?.data;

      let list: Category[] = [];

      if (data?.success && Array.isArray(data.data)) {
        list = data.data.map(mapFromApi);
      }

      // sirf active categories
      list = list.filter((c) => c.active !== false);

      // ensure must-have categories exist
      const existingSlugs = new Set(list.map((c) => norm(c.slug)));
      const extras: Category[] = MUST_HAVE_CATEGORIES.filter(
        (m) => !existingSlugs.has(norm(m.slug)),
      ).map((m) => ({
        name: m.name,
        slug: m.slug,
        order: 999,
        active: true,
      }));

      // merge + sort by order
      const finalList = [...list, ...extras].sort(
        (a, b) => (a.order ?? 999) - (b.order ?? 999),
      );

      setCategories(finalList);
    } catch (err) {
      console.error("Error loading categories", err);
      // error pe blank hi rehne do, skeleton already dikhega
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();

    // agar kahin se window.dispatchEvent("categories:updated") fire kar rahe ho,
    // to home pe bhi auto-refresh ho jayega
    const handler = () => fetchCategories();
    window.addEventListener("categories:updated", handler);
    return () => window.removeEventListener("categories:updated", handler);
  }, []);

  /* ---------- Click handling with overrides ---------- */
  const handleCategoryClick = (category: Category) => {
    const slugKey = category.slug ? norm(category.slug) : "";
    const nameKey = norm(category.name);

    if (slugKey && ROUTE_OVERRIDES[slugKey]) {
      navigate(ROUTE_OVERRIDES[slugKey]);
      return;
    }
    if (ROUTE_OVERRIDES[nameKey]) {
      navigate(ROUTE_OVERRIDES[nameKey]);
      return;
    }

    if (isMatch(category, "buy", "sale", "rent", "lease", "pg")) {
      navigate(`/${norm(category.slug)}`);
      return;
    }

    const finalSlug = norm(category.slug) || norm(category.name) || "category";
    navigate(`/${finalSlug}`);
  };

  const handleSellClick = () => navigate("/post-property");

  /* ---------- Loading skeleton ---------- */
  if (loading) {
    return (
      <div className="bg-gradient-to-b from-white to-gray-50">
        <div className="px-4 pb-8 pt-6">
          <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="w-16 h-16 bg-gray-200 rounded-2xl animate-pulse mb-3" />
                <div className="w-14 h-3 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ---------- UI ---------- */
  return (
    <div className="bg-gradient-to-b from-white to-gray-50 py-8 md:py-10 lg:py-12">
      <div className="px-4 max-w-7xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Categories</h2>
          <p className="text-sm text-gray-600 mt-1">Browse our selection</p>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-5">
          {(categories || []).map((category, index) => {
            if (!category?.name) return null;

            const isActive = activeCat?.slug === category.slug;

            const isSell =
              norm(category.slug) === "sell" ||
              norm(category.name) === "sell";

            // Use uploaded icon from API, fallback to Lucide icons
            const hasUploadedIcon = category.icon && category.icon.trim();
            const IconComponent = hasUploadedIcon
              ? null
              : categoryIcons[category.name] || Building2;

            return (
              <div
                key={category._id || category.slug || index}
                onClick={() => {
                  setActiveCat(category);
                  if (isSell) {
                    handleSellClick();
                  } else {
                    handleCategoryClick(category);
                  }
                }}
                className={`flex flex-col items-center cursor-pointer transition-all duration-300 active:scale-95 group ${
                  isActive ? "scale-105" : "hover:scale-105"
                }`}
              >
                <div
                  className={`w-16 h-16 md:w-20 md:h-20 flex items-center justify-center mb-3 rounded-2xl transition-all duration-300 border-2 overflow-hidden shadow-sm group-hover:shadow-md ${
                    isActive
                      ? "bg-red-600 border-red-700 shadow-lg"
                      : "bg-white border-red-200 group-hover:border-red-400"
                  }`}
                >
                  {hasUploadedIcon ? (
                    <img
                      src={category.icon}
                      alt={category.name}
                      className={`w-full h-full object-contain p-2 ${
                        isActive ? "brightness-0 invert" : ""
                      }`}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    IconComponent && (
                      <IconComponent
                        className={`h-8 w-8 md:h-10 md:w-10 transition-colors ${
                          isActive ? "text-white" : "text-red-600"
                        }`}
                      />
                    )
                  )}
                </div>
                <span
                  className={`text-xs md:text-sm text-center font-semibold leading-tight line-clamp-2 transition-colors ${
                    isActive ? "text-red-700" : "text-gray-900 group-hover:text-red-600"
                  }`}
                >
                  {category.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default withApiErrorBoundary(OLXStyleCategories);
