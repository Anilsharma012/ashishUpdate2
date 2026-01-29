import React, { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
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
import { Input } from "../components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Home,
  Eye,
  MessageSquare,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  Plus,
  ArrowLeft,
  Search as SearchIcon,
  Zap,
  Star,
} from "lucide-react";
import OLXStyleHeader from "../components/OLXStyleHeader";
import BottomNavigation from "../components/BottomNavigation";
import { toast } from "sonner";

// Helper function to get auth token
async function getAuthToken(): Promise<string | null> {
  let token: string | null =
    localStorage.getItem("userToken") ||
    localStorage.getItem("adminToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken") ||
    null;

  if (!token) {
    try {
      const u =
        JSON.parse(localStorage.getItem("user") || "null") ||
        JSON.parse(localStorage.getItem("currentUser") || "null");
      if (u?.token) token = u.token;
    } catch {}
  }
  return token;
}

// Razorpay script loader
function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).Razorpay) return resolve();
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Razorpay"));
    document.body.appendChild(s);
  });
}

// Auth headers helper
const authHeaders = (t: string) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${t}`,
  "x-auth-token": t,
});

interface PropertyStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

export default function SellerPropertyStatusPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const statusFromUrl =
    (searchParams.get("status") as
      | "pending"
      | "approved"
      | "rejected"
      | "all") || "pending";
  const [status, setStatus] = useState<
    "pending" | "approved" | "rejected" | "all"
  >(statusFromUrl);
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState<PropertyStats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  // Boost modal state
  const [boostModalOpen, setBoostModalOpen] = useState(false);
  const [boostPlans, setBoostPlans] = useState<any[]>([]);
  const [selectedBoostProperty, setSelectedBoostProperty] = useState<Property | null>(null);

  // Featured modal state
  const [featuredModalOpen, setFeaturedModalOpen] = useState(false);
  const [featuredPlans, setFeaturedPlans] = useState<any[]>([]);
  const [selectedFeaturedProperty, setSelectedFeaturedProperty] = useState<Property | null>(null);

  // Fetch boost plans
  const fetchBoostPlans = async () => {
    try {
      const res = await api.get("boost-plans?active=true");
      if (res.data?.success) {
        setBoostPlans(res.data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch boost plans:", error);
    }
  };

  // Open boost modal for a property
  const openBoostModal = (property: Property) => {
    setSelectedBoostProperty(property);
    fetchBoostPlans();
    setBoostModalOpen(true);
  };

  // Apply boost to property with Razorpay payment
  const applyBoost = async (plan: any) => {
    if (!selectedBoostProperty) return;
    try {
      const token = await getAuthToken();
      if (!token) {
        toast.error("Please login to continue");
        return;
      }

      await loadRazorpayScript();

      // Create Razorpay order for boost
      const createRes = await fetch("/api/payments/razorpay/boost/create", {
        method: "POST",
        credentials: "include",
        headers: authHeaders(token),
        body: JSON.stringify({
          boostPlanId: plan._id,
          propertyId: selectedBoostProperty._id,
        }),
      });

      const createJson = await createRes.json();
      if (!createRes.ok || !createJson?.success) {
        toast.error(createJson?.error || "Failed to create order");
        return;
      }

      const order = createJson.data;

      // Open Razorpay checkout
      const rzp = new (window as any).Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency || "INR",
        name: "Ashish Properties",
        description: `Boost: ${plan.name}`,
        order_id: order.razorpayOrderId,
        notes: { boostPlanId: plan._id, propertyId: selectedBoostProperty._id },
        theme: { color: "#EAB308" },
        handler: async (response: any) => {
          try {
            const verifyRes = await fetch("/api/payments/razorpay/boost/verify", {
              method: "POST",
              credentials: "include",
              headers: authHeaders(token),
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                transactionId: order.transactionId,
              }),
            });
            const verifyJson = await verifyRes.json();
            if (verifyJson?.success) {
              toast.success("Boost applied successfully!");
              setBoostModalOpen(false);
              setSelectedBoostProperty(null);
              fetchProperties();
            } else {
              toast.error(verifyJson?.error || "Payment verification failed");
            }
          } catch (err) {
            toast.error("Payment verification failed");
          }
        },
      });
      rzp.open();
    } catch (error) {
      console.error("Boost payment error:", error);
      toast.error("Failed to process payment");
    }
  };

  // Fetch featured plans
  const fetchFeaturedPlans = async () => {
    try {
      const res = await api.get("plans?isActive=true");
      if (res.data?.success) {
        setFeaturedPlans(res.data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch featured plans:", error);
    }
  };

  // Open featured modal for a property
  const openFeaturedModal = (property: Property) => {
    setSelectedFeaturedProperty(property);
    fetchFeaturedPlans();
    setFeaturedModalOpen(true);
  };

  // Apply featured to property with Razorpay payment
  const applyFeatured = async (plan: any) => {
    if (!selectedFeaturedProperty) return;
    try {
      const token = await getAuthToken();
      if (!token) {
        toast.error("Please login to continue");
        return;
      }

      await loadRazorpayScript();

      // Create Razorpay order for featured
      const createRes = await fetch("/api/payments/razorpay/featured/create", {
        method: "POST",
        credentials: "include",
        headers: authHeaders(token),
        body: JSON.stringify({
          packageId: plan._id,
          propertyId: selectedFeaturedProperty._id,
        }),
      });

      const createJson = await createRes.json();
      if (!createRes.ok || !createJson?.success) {
        toast.error(createJson?.error || "Failed to create order");
        return;
      }

      const order = createJson.data;

      // Open Razorpay checkout
      const rzp = new (window as any).Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency || "INR",
        name: "Ashish Properties",
        description: `Featured: ${plan.name}`,
        order_id: order.razorpayOrderId,
        notes: { packageId: plan._id, propertyId: selectedFeaturedProperty._id },
        theme: { color: "#3B82F6" },
        handler: async (response: any) => {
          try {
            const verifyRes = await fetch("/api/payments/razorpay/featured/verify", {
              method: "POST",
              credentials: "include",
              headers: authHeaders(token),
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                transactionId: order.transactionId,
              }),
            });
            const verifyJson = await verifyRes.json();
            if (verifyJson?.success) {
              if (verifyJson.autoApproved) {
                toast.success("Featured applied! Your property is now in Featured Properties section.");
              } else {
                toast.success("Featured request submitted. Awaiting admin approval.");
              }
              setFeaturedModalOpen(false);
              setSelectedFeaturedProperty(null);
              fetchProperties();
            } else {
              toast.error(verifyJson?.error || "Payment verification failed");
            }
          } catch (err) {
            toast.error("Payment verification failed");
          }
        },
      });
      rzp.open();
    } catch (error) {
      console.error("Featured payment error:", error);
      toast.error("Failed to process payment");
    }
  };

  // Check if property is currently boosted
  const isPropertyBoosted = (property: any) => {
    return property.boosted && property.boostEndTime && new Date(property.boostEndTime) > new Date();
  };

  // Check if property is featured
  const isPropertyFeatured = (property: any) => {
    return property.featured === true;
  };

  useEffect(() => {
    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }
    if (user.userType !== "seller") {
      navigate("/seller-dashboard", { replace: true });
      return;
    }
    fetchProperties();
  }, [user, navigate]);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("seller/properties");
      const properties = Array.isArray(response.data)
        ? response.data
        : response.data?.data || [];

      setProperties(properties);

      const counts: PropertyStats = {
        total: properties.length,
        pending: properties.filter((p) => p.approvalStatus === "pending")
          .length,
        approved: properties.filter((p) => p.approvalStatus === "approved")
          .length,
        rejected: properties.filter((p) => p.approvalStatus === "rejected")
          .length,
      };
      setStats(counts);
    } catch (err: any) {
      console.error("Error fetching properties:", err);
      setError(err?.response?.data?.message || "Failed to load properties");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered =
      status === "all"
        ? properties
        : properties.filter((p) => p.approvalStatus === status);

    if (search.trim()) {
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(search.toLowerCase()) ||
          p.location?.address?.toLowerCase().includes(search.toLowerCase()),
      );
    }

    setFilteredProperties(filtered);
  }, [properties, status, search]);

  const deleteProperty = async (propertyId: string) => {
    if (!window.confirm("Are you sure you want to delete this property?")) {
      return;
    }

    try {
      await api.delete(`/api/seller/properties/${propertyId}`);
      setProperties(properties.filter((p) => (p._id || p.id) !== propertyId));
      toast.success("Property deleted successfully");
    } catch (err: any) {
      console.error("Error deleting property:", err);
      toast.error(err?.response?.data?.message || "Failed to delete property");
    }
  };

  const getStatusBadge = (approvalStatus: string) => {
    switch (approvalStatus) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Pending Review
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="bg-red-100 text-red-800">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{approvalStatus}</Badge>;
    }
  };

  const getStatusTitle = () => {
    switch (status) {
      case "all":
        return "All Properties";
      case "pending":
        return "Pending Properties";
      case "approved":
        return "Approved Properties";
      case "rejected":
        return "Rejected Properties";
      default:
        return "Properties";
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "all":
        return "text-blue-600";
      case "pending":
        return "text-yellow-600";
      case "approved":
        return "text-green-600";
      case "rejected":
        return "text-red-600";
      default:
        return "text-gray-600";
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
            <h1 className={`text-3xl font-bold ${getStatusColor()}`}>
              {getStatusTitle()}
            </h1>
            <p className="text-gray-600 mt-1">
              {filteredProperties.length} of {stats[status] || 0} {status}{" "}
              properties
            </p>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Properties card */}
        <Card>
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <CardTitle className="flex items-center space-x-2">
              <Home className="h-5 w-5" />
              <span>{getStatusTitle()}</span>
            </CardTitle>
            <div className="flex flex-col md:flex-row gap-2">
              <div className="relative flex-1 md:flex-none">
                <Input
                  placeholder="Search by title or address..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
                <SearchIcon className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
              <Link to="/post-property">
                <Button className="bg-[#C70000] hover:bg-[#A60000] text-white w-full md:w-auto">
                  <Plus className="h-4 w-4 mr-2" /> Add New Property
                </Button>
              </Link>
            </div>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="text-gray-500">Loading properties...</div>
              </div>
            ) : filteredProperties.length === 0 ? (
              <div className="text-center py-8">
                <Home className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500 mb-4">
                  No {status} properties found
                </p>
                <Link to="/post-property">
                  <Button className="bg-[#C70000] hover:bg-[#A60000] text-white">
                    <Plus className="h-4 w-4 mr-2" /> Post Your First Property
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Property</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Views</TableHead>
                      <TableHead>Inquiries</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProperties.map((property: any, idx) => {
                      const id = property._id || property.id;
                      return (
                        <TableRow key={id || idx}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {property.title}
                              </div>
                              <div className="text-sm text-gray-500">
                                Posted{" "}
                                {new Date(
                                  property.createdAt,
                                ).toLocaleDateString()}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-bold text-[#C70000]">
                              ₹{Number(property.price).toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm flex items-start gap-1">
                              <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                              <span>{property.location?.address}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(property.approvalStatus)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-1">
                              <Eye className="h-3 w-3" />
                              <span>{property.views || 0}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-1">
                              <MessageSquare className="h-3 w-3" />
                              <span>{property.inquiries || 0}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 flex-wrap">
                              <Link to={`/property/${id}`} target="_blank">
                                <Button size="sm" variant="outline">
                                  <Eye className="h-3 w-3" />
                                </Button>
                              </Link>
                              <Link to={`/post-property?id=${id}`}>
                                <Button size="sm" variant="outline">
                                  <Edit className="h-3 w-3" />
                                </Button>
                              </Link>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteProperty(id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                              {/* Boost Button - only for approved properties */}
                              {property.approvalStatus === "approved" && (
                                isPropertyBoosted(property) ? (
                                  <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">
                                    <Zap className="h-3 w-3 mr-1" />
                                    Boosted
                                  </Badge>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="bg-yellow-50 hover:bg-yellow-100 border-yellow-300 text-yellow-700"
                                    onClick={() => openBoostModal(property)}
                                  >
                                    <Zap className="h-3 w-3 mr-1" />
                                    Boost
                                  </Button>
                                )
                              )}
                              {/* Featured Button - only for approved properties */}
                              {property.approvalStatus === "approved" && (
                                isPropertyFeatured(property) ? (
                                  <Badge className="bg-blue-100 text-blue-700 border-blue-300">
                                    <Star className="h-3 w-3 mr-1" />
                                    Featured
                                  </Badge>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="bg-blue-50 hover:bg-blue-100 border-blue-300 text-blue-700"
                                    onClick={() => openFeaturedModal(property)}
                                  >
                                    <Star className="h-3 w-3 mr-1" />
                                    Featured
                                  </Button>
                                )
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Boost Plans Modal */}
      <Dialog open={boostModalOpen} onOpenChange={setBoostModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              {selectedBoostProperty ? `Boost: ${selectedBoostProperty.title}` : "Available Boost Plans"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {boostPlans.map((plan) => (
              <Card key={plan._id} className="border-2 hover:border-yellow-500 transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-2xl font-bold text-yellow-600">₹{plan.price}</p>
                    <p className="text-sm text-gray-500">Duration: {plan.duration} hours</p>
                    {plan.features && plan.features.length > 0 && (
                      <ul className="text-sm text-gray-600 list-disc list-inside">
                        {plan.features.map((f: string, i: number) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <Button
                    className="w-full mt-4 bg-yellow-500 hover:bg-yellow-600 text-black"
                    onClick={() => applyBoost(plan)}
                  >
                    Buy & Apply
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          {boostPlans.length === 0 && (
            <p className="text-center text-gray-500 py-4">No boost plans available</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Featured Plans Modal */}
      <Dialog open={featuredModalOpen} onOpenChange={setFeaturedModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-blue-500" />
              {selectedFeaturedProperty ? `Feature: ${selectedFeaturedProperty.title}` : "Available Featured Plans"}
            </DialogTitle>
          </DialogHeader>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-700">
              <strong>Note:</strong> Since your property is already admin-approved, purchasing a featured plan will immediately add it to the Featured Properties section on the homepage.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {featuredPlans.map((plan) => (
              <Card key={plan._id} className="border-2 hover:border-blue-500 transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-2xl font-bold text-blue-600">₹{plan.price}</p>
                    <p className="text-sm text-gray-500">Duration: {plan.duration} days</p>
                    {plan.features && plan.features.length > 0 && (
                      <ul className="text-sm text-gray-600 list-disc list-inside">
                        {plan.features.map((f: string, i: number) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <Button
                    className="w-full mt-4 bg-blue-500 hover:bg-blue-600 text-white"
                    onClick={() => applyFeatured(plan)}
                  >
                    Buy & Apply
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          {featuredPlans.length === 0 && (
            <p className="text-center text-gray-500 py-4">No featured plans available</p>
          )}
        </DialogContent>
      </Dialog>

      <BottomNavigation />
    </div>
  );
}
