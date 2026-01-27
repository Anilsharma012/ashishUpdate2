import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, ChevronLeft, ChevronRight, MapPin, Bed, Bath, Square } from "lucide-react";

interface BoostedProperty {
  _id: string;
  title: string;
  price: number;
  priceType?: string;
  propertyType?: string;
  images: string[];
  location?: {
    city?: string;
    address?: string;
    area?: string;
    sector?: string;
  };
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  areaUnit?: string;
  boostEndTime?: string;
}

interface BoostBannerSettings {
  enabled: boolean;
  title: string;
  subtitle: string;
  backgroundColor: string;
  textColor: string;
  linkUrl: string;
  linkText: string;
  showBoostedCount: boolean;
}

const defaultSettings: BoostBannerSettings = {
  enabled: true,
  title: "Boost Your Property",
  subtitle: "Get more visibility with our Boost Plans",
  backgroundColor: "#dc2626",
  textColor: "#ffffff",
  linkUrl: "/packages",
  linkText: "Boost Now",
  showBoostedCount: true,
};

const formatPrice = (price: number): string => {
  if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
  if (price >= 100000) return `₹${(price / 100000).toFixed(2)} Lac`;
  if (price >= 1000) return `₹${(price / 1000).toFixed(1)}K`;
  return `₹${price}`;
};

const getMainImage = (images: string[]) => {
  if (!images || images.length === 0) return "/placeholder.svg";
  const img = images[0];
  if (img.startsWith("http")) return img;
  if (img.startsWith("/")) return img;
  return `/uploads/properties/${img}`;
};

export default function BoostBanner() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<BoostBannerSettings>(defaultSettings);
  const [properties, setProperties] = useState<BoostedProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [settingsRes, boostedRes] = await Promise.all([
          fetch("/api/boost-banner-settings"),
          fetch("/api/properties/boosted"),
        ]);

        if (settingsRes.ok) {
          const data = await settingsRes.json();
          if (data.success && data.data) {
            setSettings({ ...defaultSettings, ...data.data });
          }
        }

        if (boostedRes.ok) {
          const data = await boostedRes.json();
          if (data.success && Array.isArray(data.data)) {
            setProperties(data.data);
          }
        }
      } catch (error) {
        console.warn("Error fetching boost banner data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (properties.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % properties.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [properties.length]);

  const handlePrev = () => {
    setCurrentSlide((prev) => (prev - 1 + properties.length) % properties.length);
  };

  const handleNext = () => {
    setCurrentSlide((prev) => (prev + 1) % properties.length);
  };

  const getLocationText = (loc: BoostedProperty["location"]) => {
    if (!loc) return "Rohtak";
    const parts = [loc.sector || loc.area, loc.city].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "Rohtak";
  };

  if (loading) {
    return (
      <div className="px-4 py-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4" />
          <div className="w-full h-48 bg-gray-200 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!settings.enabled) return null;

  if (properties.length === 0) {
    return (
      <div className="px-4 mb-4">
        <div
          className="rounded-xl p-3 sm:p-4 flex items-center justify-between cursor-pointer hover:opacity-95 transition-opacity shadow-sm"
          style={{ backgroundColor: settings.backgroundColor, color: settings.textColor }}
          onClick={() => navigate(settings.linkUrl)}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="bg-white/20 p-2 rounded-lg flex-shrink-0">
              <Zap className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="font-bold text-sm sm:text-base">{settings.title}</span>
              <p className="text-xs sm:text-sm opacity-90">{settings.subtitle}</p>
            </div>
          </div>
          <button
            className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-medium text-xs sm:text-sm flex-shrink-0"
            style={{ backgroundColor: settings.textColor, color: settings.backgroundColor }}
          >
            {settings.linkText} →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-[#C70000]" />
            <h2 className="text-xl font-bold text-gray-900">{settings.title}</h2>
            {settings.showBoostedCount && (
              <span className="bg-[#C70000] text-white px-2 py-0.5 rounded-full text-xs font-medium">
                {properties.length} Active
              </span>
            )}
          </div>
          <button
            onClick={() => navigate(settings.linkUrl)}
            className="text-sm text-[#C70000] font-medium hover:underline"
          >
            {settings.linkText} →
          </button>
        </div>

        <div className="relative">
          <div
            ref={wrapRef}
            className="overflow-hidden rounded-lg touch-pan-y select-none"
            style={{ WebkitUserSelect: "none", userSelect: "none" }}
          >
            <div
              ref={trackRef}
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translate3d(-${currentSlide * 100}%,0,0)` }}
            >
              {properties.map((property, index) => {
                const mainUrl = getMainImage(property.images);
                return (
                  <div
                    key={`${property._id}-${index}`}
                    className="w-full flex-shrink-0"
                  >
                    <div
                      onClick={() => navigate(`/property/${property._id}`)}
                      className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:scale-[1.01]"
                    >
                      <div className="relative h-64 md:h-80">
                        <img
                          src={mainUrl}
                          alt={property.title}
                          draggable={false}
                          className="w-full h-full object-cover pointer-events-none select-none"
                          onError={(e) =>
                            ((e.target as HTMLImageElement).src = "/placeholder.svg")
                          }
                        />

                        <div className="absolute top-4 left-4 flex gap-2">
                          <span className="bg-yellow-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                            <Zap className="h-3 w-3" />
                            BOOSTED
                          </span>
                        </div>

                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-4 md:p-6">
                          <h3 className="text-white text-lg md:text-xl font-bold mb-1 line-clamp-1">
                            {property.title}
                          </h3>
                          <div className="flex items-center text-white/90 text-sm mb-2">
                            <MapPin className="h-4 w-4 mr-1" />
                            {getLocationText(property.location)}
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-white text-xl md:text-2xl font-bold">
                              {formatPrice(property.price)}
                              {property.priceType === "rent" && (
                                <span className="text-sm font-normal opacity-80">/mo</span>
                              )}
                            </span>

                            <div className="flex items-center gap-3 text-white/90 text-sm">
                              {property.bedrooms && (
                                <span className="flex items-center gap-1">
                                  <Bed className="h-4 w-4" />
                                  {property.bedrooms}
                                </span>
                              )}
                              {property.bathrooms && (
                                <span className="flex items-center gap-1">
                                  <Bath className="h-4 w-4" />
                                  {property.bathrooms}
                                </span>
                              )}
                              {property.area && (
                                <span className="flex items-center gap-1">
                                  <Square className="h-4 w-4" />
                                  {property.area} {property.areaUnit || "sq.ft"}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {properties.length > 1 && (
            <>
              <button
                onClick={handlePrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white shadow-lg rounded-full p-2 z-10 transition-all"
              >
                <ChevronLeft className="h-5 w-5 text-gray-700" />
              </button>
              <button
                onClick={handleNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white shadow-lg rounded-full p-2 z-10 transition-all"
              >
                <ChevronRight className="h-5 w-5 text-gray-700" />
              </button>
            </>
          )}
        </div>

        {properties.length > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            {properties.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`w-2 h-2 rounded-full transition-all ${
                  idx === currentSlide 
                    ? "bg-[#C70000] w-6" 
                    : "bg-gray-300 hover:bg-gray-400"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
