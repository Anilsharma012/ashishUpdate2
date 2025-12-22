import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Filter,
  Grid,
  List,
  MapPin,
  Heart,
  Phone,
  X,
  ZoomIn,
} from "lucide-react";
import Header from "../components/Header";
import BottomNavigation from "../components/BottomNavigation";

interface Property {
  _id: string;
  title: string;
  description: string;
  price: number;
  priceType: string;
  propertyType: string;
  subCategory?: string;
  miniSubcategoryId?: string;
  location: {
    city: string;
    area: string;
    address?: string;
  };
  images: string[];
  amenities: string[];
  specifications: {
    bedrooms?: number;
    bathrooms?: number;
    area?: number;
    furnishing?: string;
  };
  sellerName?: string;
  sellerPhone?: string;
  createdAt: string;
}

interface FilterState {
  bedrooms: string;
  bathrooms: string;
  minPrice: string;
  maxPrice: string;
  area: string;
  furnishing: string;
  sector: string;
  mohalla: string;
  landmark: string;
}

const defaultFilters: FilterState = {
  bedrooms: "",
  bathrooms: "",
  minPrice: "",
  maxPrice: "",
  area: "",
  furnishing: "",
  sector: "",
  mohalla: "",
  landmark: "",
};

export default function Listings() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [showFilters, setShowFilters] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedPropertyForZoom, setSelectedPropertyForZoom] =
    useState<Property | null>(null);

  const category = searchParams.get("category") || "";
  // Support both `subCategory` (legacy) and `subcategory` (older client) in URL
  const subCategory =
    searchParams.get("subCategory") || searchParams.get("subcategory") || "";
  // Support both `miniSubcategory` and `miniSubcategorySlug` in URL
  const miniSubcategory =
    searchParams.get("miniSubcategory") ||
    searchParams.get("miniSubcategorySlug") ||
    "";

  // Infer priceType from category or get from params
  const inferPriceType = (): string => {
    const paramPriceType = searchParams.get("priceType");
    if (paramPriceType) return paramPriceType;

    const catLower = category.toLowerCase();
    if (catLower === "rent" || catLower === "lease" || catLower === "pg")
      return "rent";
    if (catLower === "buy" || catLower === "sale") return "sale";
    return "";
  };

  const [filters, setFilters] = useState<FilterState>(() => {
    return {
      ...defaultFilters,
      bedrooms: searchParams.get("bedrooms") || "",
      bathrooms: searchParams.get("bathrooms") || "",
      minPrice: searchParams.get("minPrice") || "",
      maxPrice: searchParams.get("maxPrice") || "",
      area: searchParams.get("area") || "",
      furnishing: searchParams.get("furnishing") || "",
      sector: searchParams.get("sector") || "",
      mohalla: searchParams.get("mohalla") || "",
      landmark: searchParams.get("landmark") || "",
    };
  });

  const getCategoryName = (slug: string) => {
    const nameMap: Record<string, string> = {
      buy: "Buy",
      sale: "Sale",
      rent: "Rent",
      lease: "Lease",
      pg: "PG",
      residential: "Residential",
      commercial: "Commercial",
      plot: "Plot",
      agricultural: "Agricultural",
      "co-living": "Co-living",
    };

    return (
      nameMap[slug.toLowerCase()] ||
      slug
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")
    );
  };

  const getMiniSubcategoryName = () => {
    if (!miniSubcategory) return "";
    return miniSubcategory
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  const getPageTitle = () => {
    const parts: string[] = [];
    if (miniSubcategory) parts.push(getMiniSubcategoryName());
    if (subCategory) {
      parts.push(
        subCategory
          .split("-")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" "),
      );
    }
    if (category) parts.push(getCategoryName(category));
    return parts.filter(Boolean).join(" - ");
  };

  const fetchProperties = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();

      if (category) {
        params.append("category", category);
      }

      // ✅ IMPORTANT: Backend expects `subCategory` (not `subcategory`)
      if (subCategory) {
        params.append("subCategory", subCategory);
      }

      if (miniSubcategory) {
        params.append("miniSubcategory", miniSubcategory);
      }

      const inferredPriceType = inferPriceType();
      if (inferredPriceType) {
        params.append("priceType", inferredPriceType);
      }

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      params.append("limit", "50");
      params.append("status", "active");

      const response = await fetch(`/api/properties?${params.toString()}`, {
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch properties");
      }

      const data = await response.json();

      if (data.success && data.data && Array.isArray(data.data.properties)) {
        setProperties(data.data.properties);
      } else if (data.success && Array.isArray(data.data)) {
        setProperties(data.data);
      } else if (Array.isArray(data)) {
        setProperties(data);
      } else {
        setProperties([]);
      }
    } catch (error) {
      console.error("Error fetching properties:", error);
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, [category, miniSubcategory, subCategory, filters]);

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);

    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    setSearchParams(params);
  };

  const handlePropertyClick = (propertyId: string) => {
    navigate(`/property/${propertyId}`);
  };

  const handleFavoriteToggle = (propertyId: string) => {
    console.log("Toggle favorite for:", propertyId);
  };

  const handleContactClick = (property: Property) => {
    if (property.sellerPhone) {
      window.location.href = `tel:${property.sellerPhone}`;
    }
  };

  const openImageModal = (property: Property) => {
    setSelectedPropertyForZoom(property);
    setImageModalOpen(true);
  };

  const closeImageModal = () => {
    setSelectedPropertyForZoom(null);
    setImageModalOpen(false);
  };

  const handleBack = () => {
    navigate(-1);
  };

  if (!category) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-6xl mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Invalid Category
          </h1>
          <p className="text-gray-600 mb-6">
            Please select a valid category to browse listings.
          </p>
          <button
            onClick={() => navigate("/")}
            className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
          >
            Go Home
          </button>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-start gap-3">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {getPageTitle()}
              </h1>
              <p className="text-gray-600 mt-1">
                {loading ? "Loading..." : `${properties.length} properties found`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Filter className="w-4 h-4 text-gray-700" />
              <span className="text-sm font-medium text-gray-700">Filters</span>
            </button>

            <div className="flex items-center bg-white border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 ${viewMode === "list" ? "bg-gray-100" : "bg-white"} hover:bg-gray-50 transition-colors`}
              >
                <List className="w-5 h-5 text-gray-700" />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 ${viewMode === "grid" ? "bg-gray-100" : "bg-white"} hover:bg-gray-50 transition-colors`}
              >
                <Grid className="w-5 h-5 text-gray-700" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : properties.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No Properties Found
            </h2>
            <p className="text-gray-600 mb-6">
              Try adjusting your filters or explore other categories
            </p>
            <button
              onClick={() => navigate("/")}
              className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
            >
              Back to Home
            </button>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((property) => (
              <div
                key={property._id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handlePropertyClick(property._id)}
              >
                <div className="relative h-48 bg-gray-100">
                  {property.images?.[0] ? (
                    <img
                      src={property.images[0]}
                      alt={property.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      No Image
                    </div>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFavoriteToggle(property._id);
                    }}
                    className="absolute top-3 right-3 p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
                  >
                    <Heart className="w-5 h-5 text-gray-700" />
                  </button>

                  {property.images?.length > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openImageModal(property);
                      }}
                      className="absolute bottom-3 right-3 p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
                      title="Zoom"
                    >
                      <ZoomIn className="w-5 h-5 text-gray-700" />
                    </button>
                  )}
                </div>

                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 line-clamp-1">
                    {property.title}
                  </h3>

                  <div className="flex items-center text-sm text-gray-600 mt-2">
                    <MapPin className="w-4 h-4 mr-1" />
                    <span className="line-clamp-1">
                      {property.location?.area}, {property.location?.city}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <div className="text-lg font-bold text-red-600">
                      ₹{property.price?.toLocaleString("en-IN")}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleContactClick(property);
                      }}
                      className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      title="Call"
                    >
                      <Phone className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {properties.map((property) => (
              <div
                key={property._id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer flex flex-col md:flex-row"
                onClick={() => handlePropertyClick(property._id)}
              >
                <div className="relative w-full md:w-64 h-48 bg-gray-100 flex-shrink-0">
                  {property.images?.[0] ? (
                    <img
                      src={property.images[0]}
                      alt={property.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      No Image
                    </div>
                  )}

                  {property.images?.length > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openImageModal(property);
                      }}
                      className="absolute bottom-3 right-3 p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
                      title="Zoom"
                    >
                      <ZoomIn className="w-5 h-5 text-gray-700" />
                    </button>
                  )}
                </div>

                <div className="p-4 flex-1">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 pr-4">
                      <h3 className="font-semibold text-gray-900 text-lg">
                        {property.title}
                      </h3>
                      <p className="text-gray-600 mt-1 line-clamp-2">
                        {property.description}
                      </p>

                      <div className="flex items-center text-sm text-gray-600 mt-2">
                        <MapPin className="w-4 h-4 mr-1" />
                        <span className="line-clamp-1">
                          {property.location?.area}, {property.location?.city}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFavoriteToggle(property._id);
                      }}
                      className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                    >
                      <Heart className="w-5 h-5 text-gray-700" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <div className="text-xl font-bold text-red-600">
                      ₹{property.price?.toLocaleString("en-IN")}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleContactClick(property);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Phone className="w-4 h-4" />
                      <span className="text-sm font-medium">Call</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filters Modal */}
      {showFilters && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center">
          <div className="bg-white w-full md:w-[520px] md:rounded-xl rounded-t-xl p-5 max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
              <button
                onClick={() => setShowFilters(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-700" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Bedrooms
                </label>
                <select
                  value={filters.bedrooms}
                  onChange={(e) => handleFilterChange("bedrooms", e.target.value)}
                  className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2"
                >
                  <option value="">Any</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4+</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Bathrooms
                </label>
                <select
                  value={filters.bathrooms}
                  onChange={(e) =>
                    handleFilterChange("bathrooms", e.target.value)
                  }
                  className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2"
                >
                  <option value="">Any</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3+</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Min Price
                </label>
                <input
                  value={filters.minPrice}
                  onChange={(e) => handleFilterChange("minPrice", e.target.value)}
                  placeholder="0"
                  className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Max Price
                </label>
                <input
                  value={filters.maxPrice}
                  onChange={(e) => handleFilterChange("maxPrice", e.target.value)}
                  placeholder="10000000"
                  className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Area (sq ft)
                </label>
                <input
                  value={filters.area}
                  onChange={(e) => handleFilterChange("area", e.target.value)}
                  placeholder="e.g. 1200"
                  className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Furnishing
                </label>
                <select
                  value={filters.furnishing}
                  onChange={(e) =>
                    handleFilterChange("furnishing", e.target.value)
                  }
                  className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2"
                >
                  <option value="">Any</option>
                  <option value="furnished">Furnished</option>
                  <option value="semi-furnished">Semi Furnished</option>
                  <option value="unfurnished">Unfurnished</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Sector
                </label>
                <input
                  value={filters.sector}
                  onChange={(e) => handleFilterChange("sector", e.target.value)}
                  placeholder="e.g. 14"
                  className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Mohalla
                </label>
                <input
                  value={filters.mohalla}
                  onChange={(e) => handleFilterChange("mohalla", e.target.value)}
                  placeholder="e.g. Shivaji Colony"
                  className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-700">
                  Landmark
                </label>
                <input
                  value={filters.landmark}
                  onChange={(e) =>
                    handleFilterChange("landmark", e.target.value)
                  }
                  placeholder="e.g. Near Hospital"
                  className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2"
                />
              </div>
            </div>

            <div className="flex items-center justify-between mt-6">
              <button
                onClick={() => {
                  setFilters(defaultFilters);
                  const params = new URLSearchParams(searchParams);
                  Object.keys(defaultFilters).forEach((k) => params.delete(k));
                  setSearchParams(params);
                }}
                className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Reset
              </button>
              <button
                onClick={() => setShowFilters(false)}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Zoom Modal */}
      {imageModalOpen && selectedPropertyForZoom && (
        <div
          className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4"
          onClick={closeImageModal}
        >
          <div
            className="bg-white rounded-xl overflow-hidden max-w-3xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-3 border-b">
              <div className="font-semibold text-gray-900">
                {selectedPropertyForZoom.title}
              </div>
              <button
                onClick={closeImageModal}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-700" />
              </button>
            </div>
            <div className="bg-black">
              <img
                src={selectedPropertyForZoom.images?.[0]}
                alt={selectedPropertyForZoom.title}
                className="w-full max-h-[75vh] object-contain"
              />
            </div>
          </div>
        </div>
      )}

      <BottomNavigation />
    </div>
  );
}
