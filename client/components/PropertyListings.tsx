import { useState, useEffect } from "react";
import { Heart, MapPin, Phone, Calendar, Send, Zap, Crown } from "lucide-react";
import { Button } from "./ui/button";
import Watermark from "./Watermark";
import EnquiryModal from "./EnquiryModal";

type AnyProp = {
  id: string | number;
  title: string;
  location: string;
  price: string;
  image: string;
  timeAgo: string;
  premium?: boolean;
  isPremium?: boolean;
  boosted?: boolean;
  isAdminPosted?: boolean;
  plan?: string;
  postedBy?: { role?: string };
  createdBy?: { role?: string };
  ownerRole?: string;
  source?: string;
};

const formatPrice = (price: number, priceType?: string): string => {
  let formatted = "";
  if (price >= 10000000) {
    formatted = `₹${(price / 10000000).toFixed(2)} Cr`;
  } else if (price >= 100000) {
    formatted = `₹${(price / 100000).toFixed(2)} Lac`;
  } else if (price >= 1000) {
    formatted = `₹${(price / 1000).toFixed(1)}K`;
  } else {
    formatted = `₹${price}`;
  }
  if (priceType === "rent") formatted += "/month";
  return formatted;
};

const formatTimeAgo = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 7) return `${diffDays} days ago`;
  return `${Math.floor(diffDays / 7)} weeks ago`;
};

const isAdminPosted = (p: AnyProp) =>
  Boolean(
    p.isAdminPosted ||
      p.source === "admin" ||
      p.postedBy?.role === "admin" ||
      p.createdBy?.role === "admin" ||
      p.ownerRole === "admin",
  );

const isPremium = (p: AnyProp) =>
  !isAdminPosted(p) &&
  Boolean(
    p.isPremium ||
      p.premium ||
      (typeof p.plan === "string" && p.plan.toLowerCase().includes("premium")),
  );

function Badge({ ap, premium, boosted }: { ap?: boolean; premium?: boolean; boosted?: boolean }) {
  if (ap) {
    return (
      <div className="absolute top-2 left-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white px-2 py-1 rounded-full text-[10px] md:text-xs font-semibold shadow-lg flex items-center gap-1">
        <svg className="w-3 h-3 md:w-3.5 md:h-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        <span>AP Verified</span>
      </div>
    );
  }
  if (boosted) {
    return (
      <div className="absolute top-2 left-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-2 py-1 rounded-md text-[10px] md:text-xs font-bold shadow flex items-center gap-1">
        <Zap className="h-3 w-3" />
        Featured
      </div>
    );
  }
  if (premium) {
    return (
      <div className="absolute top-2 left-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white px-2 py-1 rounded-md text-[10px] md:text-xs font-bold shadow flex items-center gap-1">
        <Crown className="h-3 w-3" />
        Premium
      </div>
    );
  }
  return null;
}

function FreshCard({
  property,
  onEnquiry,
}: {
  property: AnyProp;
  onEnquiry: (p: AnyProp) => void;
}) {
  const ap = isAdminPosted(property);
  const prem = isPremium(property);
  const boosted = property.boosted === true;
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-sm transition-shadow">
      <div className="relative aspect-[4/3] bg-gray-100">
        <img
          src={property.image}
          alt={property.title}
          className="w-full h-full object-cover pointer-events-none select-none"
          draggable={false}
        />
        <Badge ap={ap} premium={prem} boosted={boosted} />
        <button className="absolute top-2 right-2 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-md">
          <Heart className="h-4 w-4 text-gray-600" />
        </button>
      </div>

      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-900 leading-tight line-clamp-2">
            {property.title}
          </h3>
          <span className="text-sm font-bold text-[#C70000] whitespace-nowrap">
            {property.price}
          </span>
        </div>

        <div className="mt-1 flex items-center text-gray-500">
          <MapPin className="h-3.5 w-3.5 mr-1" />
          <span className="text-xs line-clamp-1">{property.location}</span>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-gray-400 inline-flex items-center">
            <Calendar className="h-3 w-3 mr-1" />
            {property.timeAgo}
          </span>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs border-[#C70000] text-[#C70000]"
              onClick={() => onEnquiry(property)}
              data-testid="enquiry-btn"
            >
              <Send className="h-3 w-3 mr-1" />
              Enquiry
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs border-[#C70000] text-[#C70000]"
            >
              <Phone className="h-3 w-3 mr-1" />
              Call
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PropertyListings() {
  const [enquiryModalOpen, setEnquiryModalOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [freshRecommendations, setFreshRecommendations] = useState<AnyProp[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFreshRecommendations = async () => {
      try {
        setLoading(true);
        const seenIds = new Set<string>();
        const allProps: AnyProp[] = [];

        // Fetch both premium and boosted properties
        const [premiumRes, boostedRes] = await Promise.all([
          (window as any).api("/properties?premium=true&status=active&limit=20", { timeout: 10000 }),
          (window as any).api("/properties/boosted", { timeout: 10000 }),
        ]);

        // Process boosted properties first (priority)
        if (boostedRes?.ok && boostedRes.json?.success) {
          const boostedData = boostedRes.json.data || [];
          const boostedArray = Array.isArray(boostedData) ? boostedData : [];
          boostedArray.forEach((p: any) => {
            if (!seenIds.has(p._id)) {
              seenIds.add(p._id);
              allProps.push({
                id: p._id,
                title: p.title || "Featured Property",
                price: formatPrice(p.price || 0, p.priceType),
                location: p.location?.address || p.location?.city || "Rohtak",
                image: p.images?.[0] || "/placeholder.svg",
                timeAgo: formatTimeAgo(p.createdAt),
                boosted: true,
                premium: p.premium,
              });
            }
          });
        }

        // Process premium properties
        if (premiumRes?.ok && premiumRes.json?.success) {
          const rawData = premiumRes.json.data?.properties || premiumRes.json.data || [];
          const dataArray = Array.isArray(rawData) ? rawData : [];
          dataArray.filter((p: any) => p.premium === true || p.isPremium === true)
            .forEach((p: any) => {
              if (!seenIds.has(p._id)) {
                seenIds.add(p._id);
                allProps.push({
                  id: p._id,
                  title: p.title || "Premium Property",
                  price: formatPrice(p.price || 0, p.priceType),
                  location: p.location?.address || p.location?.city || "Rohtak",
                  image: p.images?.[0] || "/placeholder.svg",
                  timeAgo: formatTimeAgo(p.createdAt),
                  premium: true,
                  boosted: false,
                });
              }
            });
        }

        setFreshRecommendations(allProps);
      } catch (e) {
        console.warn("Fresh recommendations fetch failed:", e);
        setFreshRecommendations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFreshRecommendations();
  }, []);

  const handleEnquiry = (property: AnyProp) => {
    setSelectedProperty(property);
    setEnquiryModalOpen(true);
  };

  return (
    <div className="bg-white pb-20">
      {/* Fresh Recommendations - Shows both Premium and Boosted properties */}
      <section className="py-4">
        <div className="px-4">
          <h2 className="text-lg font-bold text-gray-900 mb-3">
            Fresh Recommendations
          </h2>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading recommendations...</div>
          ) : freshRecommendations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No premium or featured properties available</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {freshRecommendations.map((property) => (
                <FreshCard
                  key={property.id}
                  property={property}
                  onEnquiry={handleEnquiry}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Enquiry Modal */}
      {selectedProperty && (
        <EnquiryModal
          isOpen={enquiryModalOpen}
          onClose={() => {
            setEnquiryModalOpen(false);
            setSelectedProperty(null);
          }}
          propertyId={String(selectedProperty.id)}
          propertyTitle={selectedProperty.title}
          ownerName="Property Owner"
        />
      )}
    </div>
  );
}
