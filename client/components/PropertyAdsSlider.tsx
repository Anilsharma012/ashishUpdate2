import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, MapPin, Home, IndianRupee } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PremiumProperty {
  _id: string;
  title: string;
  price: number;
  priceType?: string;
  propertyType?: string;
  images: string[];
  location?: {
    city?: string;
    sector?: string;
    address?: string;
  };
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  areaUnit?: string;
  premium?: boolean;
  featured?: boolean;
}

const SLIDE_INTERVAL = 4000;
const SWIPE_THRESHOLD_RATIO = 0.18;
const SETTLE_MS = 320;

const formatPrice = (price: number): string => {
  if (price >= 10000000) {
    return `${(price / 10000000).toFixed(2)} Cr`;
  } else if (price >= 100000) {
    return `${(price / 100000).toFixed(2)} Lac`;
  } else if (price >= 1000) {
    return `${(price / 1000).toFixed(1)}K`;
  }
  return price.toString();
};

const PropertyAdsSlider: React.FC = () => {
  const navigate = useNavigate();
  const [properties, setProperties] = useState<PremiumProperty[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentSlide, _setCurrentSlide] = useState(0);
  const currentSlideRef = useRef(0);
  const setCurrentSlide = (n: number | ((p: number) => number)) => {
    const val = typeof n === "function" ? (n as any)(currentSlideRef.current) : n;
    currentSlideRef.current = val;
    _setCurrentSlide(val);
  };

  const autoplayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const dxRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastClickSuppressedRef = useRef(false);

  const transitionEnabledRef = useRef(true);

  const trackRef = useRef<HTMLDivElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const slides = useMemo(
    () => properties.map((prop) => ({ type: "property" as const, data: prop })),
    [properties]
  );

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await (window as any).api("/properties?premium=true&status=active&limit=20", { timeout: 10000 });
        if (res?.ok && res.json?.success) {
          const rawData = res.json.data?.properties || res.json.data || [];
          const dataArray = Array.isArray(rawData) ? rawData : [];
          const premiumProps: PremiumProperty[] = dataArray
            .filter((p: any) => p.premium === true || p.featured === true)
            .map((p: any) => ({
              _id: p._id,
              title: p.title || "Premium Property",
              price: p.price || 0,
              priceType: p.priceType,
              propertyType: p.propertyType,
              images: Array.isArray(p.images) ? p.images : [],
              location: p.location || {},
              bedrooms: p.bedrooms,
              bathrooms: p.bathrooms,
              area: p.area,
              areaUnit: p.areaUnit || "sq.ft",
              premium: p.premium,
              featured: p.featured,
            }));
          setProperties(premiumProps);
        } else {
          setProperties([]);
        }
      } catch (e) {
        console.warn("Premium properties fetch failed:", e);
        setProperties([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const width = () => wrapRef.current?.getBoundingClientRect().width || 1;
  const applyTransform = (offsetPercent: number) => {
    const el = trackRef.current;
    if (!el) return;
    el.style.transform = `translate3d(${offsetPercent}%,0,0)`;
  };
  const syncToSlide = () => {
    const el = trackRef.current;
    if (!el) return;
    if (!transitionEnabledRef.current) {
      el.style.transition = `transform ${SETTLE_MS}ms ease`;
      transitionEnabledRef.current = true;
    }
    applyTransform(-currentSlideRef.current * 100);
  };

  const clearAutoplay = () => {
    if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current);
    autoplayTimerRef.current = null;
  };
  const startAutoplay = () => {
    clearAutoplay();
    if (slides.length <= 1) return;
    if (draggingRef.current) return;
    if (document.visibilityState !== "visible") return;
    autoplayTimerRef.current = setInterval(() => {
      setCurrentSlide((p) => (p + 1) % slides.length);
    }, SLIDE_INTERVAL);
  };

  useEffect(() => {
    startAutoplay();
    return clearAutoplay;
  }, [slides.length]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") startAutoplay();
      else clearAutoplay();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    const wrap = wrapRef.current;
    const track = trackRef.current;
    if (!wrap || !track) return;

    track.style.willChange = "transform";

    const setNoTransition = () => {
      if (transitionEnabledRef.current) {
        track.style.transition = "none";
        transitionEnabledRef.current = false;
      }
    };

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      draggingRef.current = true;
      startXRef.current = e.clientX;
      dxRef.current = 0;
      lastClickSuppressedRef.current = false;
      clearAutoplay();
      setNoTransition();
      wrap.setPointerCapture(e.pointerId);
    };

    const onMove = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      e.cancelable && e.preventDefault();
      dxRef.current = e.clientX - startXRef.current;

      if (rafRef.current == null) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          const w = width();
          const offsetPct = -currentSlideRef.current * 100 + (dxRef.current / w) * 100;
          applyTransform(offsetPct);
        });
      }
    };

    const onUp = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      wrap.releasePointerCapture(e.pointerId);

      const w = width();
      const ratio = Math.abs(dxRef.current) / w;
      const dir = dxRef.current < 0 ? 1 : -1;

      if (Math.abs(dxRef.current) > 8) lastClickSuppressedRef.current = true;

      if (ratio > SWIPE_THRESHOLD_RATIO) {
        const max = slides.length - 1;
        const target = Math.max(0, Math.min(max, currentSlideRef.current + dir));
        setCurrentSlide(target);
      }
      syncToSlide();
      startAutoplay();
    };

    syncToSlide();

    wrap.addEventListener("pointerdown", onDown, { passive: true });
    wrap.addEventListener("pointermove", onMove, { passive: false });
    wrap.addEventListener("pointerup", onUp, { passive: true });
    wrap.addEventListener("pointercancel", onUp, { passive: true });

    return () => {
      wrap.removeEventListener("pointerdown", onDown as any);
      wrap.removeEventListener("pointermove", onMove as any);
      wrap.removeEventListener("pointerup", onUp as any);
      wrap.removeEventListener("pointercancel", onUp as any);
    };
  }, [slides.length]);

  useEffect(() => {
    syncToSlide();
  }, [currentSlide]);

  const next = () => slides.length > 1 && setCurrentSlide((p) => (p + 1) % slides.length);
  const prev = () => slides.length > 1 && setCurrentSlide((p) => (p - 1 + slides.length) % slides.length);

  const handlePropertyClick = (property: PremiumProperty) => {
    if (lastClickSuppressedRef.current) return;
    navigate(`/property/${property._id}`);
  };

  const getLocationText = (loc: PremiumProperty["location"]) => {
    if (!loc) return "Rohtak";
    const parts = [loc.sector, loc.city].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "Rohtak";
  };

  const getMainImage = (images: string[]) => {
    if (images.length === 0) return "/placeholder.svg";
    const img = images[0];
    if (img.startsWith("http")) return img;
    if (img.startsWith("/")) return img;
    return `/uploads/properties/${img}`;
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
  if (slides.length === 0) return null;

  return (
    <div className="px-4 py-6 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Premium Properties</h2>
          <span className="text-sm text-[#C70000] font-medium">{properties.length} Premium Listings</span>
        </div>

        <div className="relative">
          <div
            ref={wrapRef}
            className="overflow-hidden rounded-lg touch-pan-y select-none"
            style={{ WebkitUserSelect: "none", userSelect: "none" }}
          >
            <div
              ref={trackRef}
              className="flex"
              style={{ transform: `translate3d(-${currentSlide * 100}%,0,0)` }}
            >
              {slides.map(({ data: property }, index) => {
                const mainUrl = getMainImage(property.images);
                return (
                  <div key={`${property._id}-${index}`} className="w-full flex-shrink-0">
                    <div
                      onClick={() => handlePropertyClick(property)}
                      className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:scale-[1.01]"
                    >
                      <div className="relative h-64 md:h-80">
                        <img
                          src={mainUrl}
                          alt={property.title}
                          draggable={false}
                          className="w-full h-full object-cover pointer-events-none select-none"
                          onError={(e) => ((e.target as HTMLImageElement).src = "/placeholder.svg")}
                        />
                        
                        <div className="absolute top-4 left-4 flex gap-2">
                          <span className="bg-[#C70000] text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                            PREMIUM
                          </span>
                          {property.featured && (
                            <span className="bg-yellow-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                              FEATURED
                            </span>
                          )}
                        </div>

                        {property.priceType && (
                          <div className="absolute top-4 right-4">
                            <span className="bg-white/90 text-gray-800 px-3 py-1 rounded-full text-xs font-medium capitalize">
                              For {property.priceType}
                            </span>
                          </div>
                        )}

                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                        
                        <div className="absolute left-4 right-4 bottom-4 text-white">
                          <div className="flex items-center gap-2 mb-2">
                            <IndianRupee className="h-5 w-5" />
                            <span className="text-2xl font-bold">{formatPrice(property.price)}</span>
                            {property.priceType === "rent" && <span className="text-sm opacity-80">/month</span>}
                          </div>
                          
                          <h3 className="text-lg font-semibold drop-shadow line-clamp-1 mb-2">{property.title}</h3>
                          
                          <div className="flex items-center gap-1 text-sm opacity-90">
                            <MapPin className="h-4 w-4" />
                            <span className="line-clamp-1">{getLocationText(property.location)}</span>
                          </div>

                          <div className="flex items-center gap-4 mt-2 text-sm">
                            {property.bedrooms && (
                              <span className="flex items-center gap-1">
                                <Home className="h-4 w-4" />
                                {property.bedrooms} BHK
                              </span>
                            )}
                            {property.area && (
                              <span>{property.area} {property.areaUnit || "sq.ft"}</span>
                            )}
                            {property.propertyType && (
                              <span className="capitalize bg-white/20 px-2 py-0.5 rounded">{property.propertyType}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {slides.length > 1 && (
            <>
              <button
                onClick={prev}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-2 rounded-full shadow-lg transition-all z-10"
                aria-label="Previous property"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={next}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-2 rounded-full shadow-lg transition-all z-10"
                aria-label="Next property"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {slides.length > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  idx === currentSlide 
                    ? "bg-[#C70000] w-6" 
                    : "bg-gray-300 hover:bg-gray-400"
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}

        <div className="mt-4 overflow-x-auto pb-2 scrollbar-hide">
          <div className="flex gap-3" style={{ minWidth: "max-content" }}>
            {slides.map(({ data: property }, idx) => (
              <button
                key={`thumb-${property._id}`}
                onClick={() => setCurrentSlide(idx)}
                className={`relative flex-shrink-0 w-20 h-16 rounded-lg overflow-hidden transition-all ${
                  idx === currentSlide 
                    ? "ring-2 ring-[#C70000] ring-offset-2" 
                    : "opacity-70 hover:opacity-100"
                }`}
              >
                <img
                  src={getMainImage(property.images)}
                  alt={property.title}
                  className="w-full h-full object-cover"
                  onError={(e) => ((e.target as HTMLImageElement).src = "/placeholder.svg")}
                />
                {idx === currentSlide && (
                  <div className="absolute inset-0 bg-[#C70000]/20" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyAdsSlider;
