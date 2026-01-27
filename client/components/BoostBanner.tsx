import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, ChevronLeft, ChevronRight, MapPin, IndianRupee } from "lucide-react";

interface BoostedProperty {
  _id: string;
  title: string;
  price: number;
  priceType?: string;
  images: string[];
  location?: {
    city?: string;
    address?: string;
    area?: string;
  };
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
  title: "Boosted Properties",
  subtitle: "Premium visibility ads",
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

export default function BoostBanner() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<BoostBannerSettings>(defaultSettings);
  const [properties, setProperties] = useState<BoostedProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);

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
      setCurrentIndex((prev) => (prev + 1) % properties.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [properties.length]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + properties.length) % properties.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % properties.length);
  };

  if (loading) return null;

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
            {settings.linkText}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 mb-4">
      <div
        className="rounded-xl overflow-hidden shadow-md"
        style={{ backgroundColor: settings.backgroundColor }}
      >
        <div className="flex items-center justify-between px-3 py-2" style={{ color: settings.textColor }}>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            <span className="font-bold text-sm">{settings.title}</span>
            {settings.showBoostedCount && (
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                {properties.length} Active
              </span>
            )}
          </div>
          <button
            className="px-3 py-1 rounded-lg text-xs font-medium"
            style={{ backgroundColor: settings.textColor, color: settings.backgroundColor }}
            onClick={() => navigate(settings.linkUrl)}
          >
            {settings.linkText}
          </button>
        </div>

        <div className="relative bg-white">
          <div
            ref={sliderRef}
            className="flex transition-transform duration-300 ease-in-out"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {properties.map((property) => (
              <div
                key={property._id}
                className="min-w-full flex cursor-pointer hover:bg-gray-50"
                onClick={() => navigate(`/property/${property._id}`)}
              >
                <div className="w-24 h-20 sm:w-32 sm:h-24 flex-shrink-0">
                  <img
                    src={property.images?.[0] || "/placeholder.svg"}
                    alt={property.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 p-2 sm:p-3 min-w-0">
                  <h4 className="font-semibold text-gray-900 text-sm truncate">{property.title}</h4>
                  <div className="flex items-center text-gray-500 text-xs mt-1">
                    <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                    <span className="truncate">
                      {property.location?.area || property.location?.address || property.location?.city || "Rohtak"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[#C70000] font-bold text-sm flex items-center">
                      {formatPrice(property.price)}
                      {property.priceType === "rent" && <span className="text-xs font-normal text-gray-500">/mo</span>}
                    </span>
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-medium">
                      Boosted
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {properties.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                className="absolute left-1 top-1/2 -translate-y-1/2 bg-white/90 shadow rounded-full p-1 hover:bg-white"
              >
                <ChevronLeft className="h-4 w-4 text-gray-700" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleNext(); }}
                className="absolute right-1 top-1/2 -translate-y-1/2 bg-white/90 shadow rounded-full p-1 hover:bg-white"
              >
                <ChevronRight className="h-4 w-4 text-gray-700" />
              </button>
            </>
          )}
        </div>

        {properties.length > 1 && (
          <div className="flex justify-center gap-1 py-2 bg-white">
            {properties.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  idx === currentIndex ? "bg-[#C70000]" : "bg-gray-300"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
