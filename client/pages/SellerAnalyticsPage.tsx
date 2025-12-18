import React, { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Property } from "@shared/types";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import {
  Eye,
  MessageSquare,
  TrendingUp,
  ArrowLeft,
  Calendar,
  BarChart3,
} from "lucide-react";
import OLXStyleHeader from "../components/OLXStyleHeader";
import BottomNavigation from "../components/BottomNavigation";

interface PropertyWithAnalytics {
  _id?: string;
  id?: string;
  title: string;
  views?: number;
  inquiries?: number;
  price: number;
  location?: {
    address?: string;
  };
  approvalStatus?: string;
  createdAt?: string;
}

export default function SellerAnalyticsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [properties, setProperties] = useState<PropertyWithAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({
    totalViews: 0,
    totalInquiries: 0,
    avgViewsPerProperty: 0,
    topProperty: null as PropertyWithAnalytics | null,
  });

  useEffect(() => {
    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }
    if (user.userType !== "seller") {
      navigate("/seller-dashboard", { replace: true });
      return;
    }
    fetchAnalytics();
  }, [user, navigate]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/api/seller/properties");
      const properties = Array.isArray(response.data)
        ? response.data
        : response.data?.data || [];

      setProperties(properties);

      // Calculate analytics
      const totalViews = properties.reduce((sum, p) => sum + (p.views || 0), 0);
      const totalInquiries = properties.reduce(
        (sum, p) => sum + (p.inquiries || 0),
        0,
      );
      const avgViews =
        properties.length > 0 ? totalViews / properties.length : 0;

      // Find top property by views
      const topProperty = properties.reduce((top, p) => {
        return (p.views || 0) > (top?.views || 0) ? p : top;
      }, properties[0]);

      setStats({
        totalViews,
        totalInquiries,
        avgViewsPerProperty: Math.round(avgViews),
        topProperty,
      });
    } catch (err: any) {
      console.error("Error fetching analytics:", err);
      setError(err?.response?.data?.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-gray-50 flex flex-col"
      style={{ paddingBottom: "calc(88px + env(safe-area-inset-bottom))" }}
    >
      <OLXStyleHeader />

      <div className="container mx-auto px-4 py-6 flex-1">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/seller-dashboard")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-blue-600">Analytics</h1>
            <p className="text-gray-600 mt-1">View your property performance</p>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="text-gray-500">Loading analytics...</div>
          </div>
        ) : (
          <>
            {/* Key Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Views
                  </CardTitle>
                  <Eye className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {stats.totalViews}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Across all properties
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Inquiries
                  </CardTitle>
                  <MessageSquare className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {stats.totalInquiries}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Buyer interest</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Avg Views
                  </CardTitle>
                  <BarChart3 className="h-4 w-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">
                    {stats.avgViewsPerProperty}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Per property</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Active Listings
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    {properties.length}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Total properties</p>
                </CardContent>
              </Card>
            </div>

            {/* Top Property */}
            {stats.topProperty && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Top Performing Property
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900">
                          {stats.topProperty.title}
                        </h3>
                        <p className="text-sm text-gray-600 mt-2">
                          {stats.topProperty.location?.address}
                        </p>
                        <div className="flex items-center gap-4 mt-3">
                          <div>
                            <div className="text-2xl font-bold text-blue-600">
                              {stats.topProperty.views || 0}
                            </div>
                            <div className="text-xs text-gray-500">Views</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-green-600">
                              {stats.topProperty.inquiries || 0}
                            </div>
                            <div className="text-xs text-gray-500">
                              Inquiries
                            </div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-[#C70000]">
                              ₹
                              {Number(stats.topProperty.price).toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-500">Price</div>
                          </div>
                        </div>
                      </div>
                      <Badge className="bg-blue-100 text-blue-800">
                        Best Performer
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* All Properties Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Property Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                {properties.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">
                      No properties yet. Post your first property to see
                      analytics.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {properties
                      .sort((a, b) => (b.views || 0) - (a.views || 0))
                      .map((property, idx) => {
                        const id = property._id || property.id;
                        return (
                          <div
                            key={id || idx}
                            className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-all"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-gray-900 truncate">
                                  {property.title}
                                </h4>
                                <p className="text-xs text-gray-500 mt-1">
                                  {property.location?.address}
                                </p>
                              </div>
                              <div className="flex items-center gap-4 ml-3">
                                <div className="text-right">
                                  <div className="text-lg font-bold text-blue-600">
                                    {property.views || 0}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    views
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-bold text-green-600">
                                    {property.inquiries || 0}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    inquiries
                                  </div>
                                </div>
                                <div className="text-right min-w-max">
                                  <div className="text-xs text-gray-600">
                                    {property.approvalStatus === "approved" ? (
                                      <Badge className="bg-green-100 text-green-800">
                                        Live
                                      </Badge>
                                    ) : property.approvalStatus ===
                                      "pending" ? (
                                      <Badge className="bg-yellow-100 text-yellow-800">
                                        Pending
                                      </Badge>
                                    ) : (
                                      <Badge className="bg-red-100 text-red-800">
                                        Rejected
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
}
