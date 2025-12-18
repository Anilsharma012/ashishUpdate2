import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Loader2, ChevronRight } from "lucide-react";

interface MiniSubcategoryWithCount {
  _id?: string;
  subcategoryId?: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  iconUrl?: string;
  count: number;
  active?: boolean;
  isActive?: boolean;
}

interface MiniSubcategoryListingPageProps {
  subcategoryId: string;
  subcategoryName: string;
  categorySlug: string;
  priceType?: "sale" | "rent"; // Optional: Buy or Rent
}

export default function MiniSubcategoryListingPage({
  subcategoryId,
  subcategoryName,
  categorySlug,
  priceType,
}: MiniSubcategoryListingPageProps) {
  const navigate = useNavigate();
  const [miniSubcategories, setMiniSubcategories] = useState<
    MiniSubcategoryWithCount[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ✅ Same slug logic as backend (subcategories-new.ts)
  const toSlug = (value: string) => {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  useEffect(() => {
    const fetchMiniSubcategories = async () => {
      try {
        setLoading(true);
        setError("");

        // ✅ FIX 1: Public endpoint (admin endpoint yaha use nahi karna)
        const response = await fetch(
          `/api/mini-subcategories/${subcategoryId}/with-counts`,
        );

        if (!response.ok) {
          throw new Error("Failed to fetch mini-subcategories");
        }

        const data = await response.json();

        if (data?.success && Array.isArray(data.data)) {
          // ✅ Optional: only active minis (agar flags aa rahe ho)
          const cleaned = data.data.filter((m: MiniSubcategoryWithCount) => {
            const a = m.active;
            const ia = m.isActive;
            return a !== false && ia !== false;
          });

          setMiniSubcategories(cleaned);
        } else {
          setMiniSubcategories([]);
          setError("No mini-subcategories found");
        }
      } catch (err) {
        console.error("Error fetching mini-subcategories:", err);
        setMiniSubcategories([]);
        setError("Failed to load mini-subcategories");
      } finally {
        setLoading(false);
      }
    };

    if (subcategoryId) {
      fetchMiniSubcategories();
    } else {
      setLoading(false);
      setMiniSubcategories([]);
      setError("Invalid subcategory");
    }
  }, [subcategoryId]);

  const handleMiniClick = (miniSlug: string) => {
    const params = new URLSearchParams();

    // categorySlug = top-level category/page slug
    params.append("category", categorySlug);

    // ✅ FIX 2: subCategory bhi bhejo (warna mini resolve/filter toot jata)
    // subcategoryName ko slug bana ke bhej rahe (backend same logic use karta)
    const subCategorySlug = toSlug(subcategoryName);
    if (subCategorySlug) {
      params.append("subCategory", subCategorySlug);
    }

    // miniSubcategory slug
    params.append("miniSubcategory", miniSlug);

    // rent/sale tab support
    if (priceType) {
      params.append("priceType", priceType);
    }

    navigate(`/listings?${params.toString()}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
      </div>
    );
  }

  if (error && miniSubcategories.length === 0) {
    return (
      <div className="text-center py-12 text-gray-600">
        <p className="text-lg font-semibold">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {subcategoryName}
        </h2>
        <p className="text-gray-600">
          Browse properties by type within {subcategoryName}
        </p>
      </div>

      {miniSubcategories.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {miniSubcategories.map((mini) => (
            <Card
              key={mini._id || mini.slug}
              className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden"
              onClick={() => handleMiniClick(mini.slug)}
            >
              <CardContent className="p-0">
                <div className="p-4 border-b border-gray-200">
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

                    {/* icon or iconUrl support */}
                    {mini.icon ? (
                      <div className="text-2xl ml-2">{mini.icon}</div>
                    ) : mini.iconUrl ? (
                      <img
                        src={mini.iconUrl}
                        alt={mini.name}
                        className="w-8 h-8 object-contain ml-2"
                        loading="lazy"
                      />
                    ) : null}
                  </div>
                </div>

                <div className="p-4 bg-gray-50 flex items-center justify-between">
                  <Badge variant="secondary" className="text-base">
                    {mini.count} {mini.count === 1 ? "property" : "properties"}
                  </Badge>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-600">
          <p className="text-lg">No mini-subcategories available yet.</p>
        </div>
      )}
    </div>
  );
}
