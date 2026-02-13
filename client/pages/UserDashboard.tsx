import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { Property } from "@shared/types";
import { api } from "../lib/api";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import {
  Plus,
  Home,
  Eye,
  MessageSquare,
  Heart,
  Phone,
  User,
  Settings,
  LogOut,
  Bell,
  Clock,
  CheckCircle,
  Search,
  Zap,
  Crown,
  X,
} from "lucide-react";
import { Input } from "../components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import OLXStyleHeader from "../components/OLXStyleHeader";
import BottomNavigation from "../components/BottomNavigation";

interface BoostPlan {
  _id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  features: string[];
  active: boolean;
}

interface FeaturedPlan {
  _id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  features: string[];
  type: string;
  active: boolean;
}

interface Notification {
  _id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

const UserDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [stats, setStats] = useState({
    totalProperties: 0,
    pendingApproval: 0,
    approved: 0,
    rejected: 0,
    premiumListings: 0,
    premiumPending: 0,
    premiumApproved: 0,
    totalViews: 0,
    totalInquiries: 0,
    unreadNotifications: 0,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [boostPlans, setBoostPlans] = useState<BoostPlan[]>([]);
  const [boostModalOpen, setBoostModalOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [featuredPlans, setFeaturedPlans] = useState<FeaturedPlan[]>([]);
  const [featuredModalOpen, setFeaturedModalOpen] = useState(false);
  const [applyingFeatured, setApplyingFeatured] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    fetchUserData();
    fetchBoostPlans();
    fetchFeaturedPlans();
  }, [user]);

  const fetchBoostPlans = async () => {
    try {
      const res = await api.get("/boost-plans?active=true");
      if (res.data.success) {
        setBoostPlans(res.data.data);
      }
    } catch (error) {
      console.error("Error fetching boost plans:", error);
    }
  };

  const fetchFeaturedPlans = async () => {
    try {
      const res = await api.get("/packages?active=true&type=featured");
      if (res.data.success) {
        setFeaturedPlans(res.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching featured plans:", error);
    }
  };

  const handleBoostProperty = (property: Property) => {
    setSelectedProperty(property);
    setBoostModalOpen(true);
  };

  const handleFeaturedProperty = (property: Property) => {
    setSelectedProperty(property);
    setFeaturedModalOpen(true);
  };

  const applyFeatured = async (planId: string) => {
    if (!selectedProperty) return;
    
    const token = localStorage.getItem("token");
    setApplyingFeatured(true);
    
    try {
      const res = await api.post("/featured/apply", {
        propertyId: selectedProperty._id,
        packageId: planId,
      }, token);
      
      if (res.data.success) {
        alert("Featured request submitted! Admin will review and approve your property to show in Featured Properties section.");
        setFeaturedModalOpen(false);
        fetchUserData();
      }
    } catch (error: any) {
      console.error("Error applying featured:", error);
      alert(error.response?.data?.message || "Failed to apply featured. Please try again.");
    } finally {
      setApplyingFeatured(false);
    }
  };

  const loadRazorpayScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if ((window as any).Razorpay) return resolve();
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Failed to load Razorpay"));
      document.body.appendChild(s);
    });
  };

  const getToken = (): string | null => {
    return localStorage.getItem("userToken") ||
      localStorage.getItem("adminToken") ||
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("accessToken") ||
      null;
  };

  const applyBoost = async (plan: any) => {
    if (!selectedProperty) return;

    const token = getToken();
    try {
      if (!token) {
        alert("Please login to continue");
        return;
      }

      await loadRazorpayScript();

      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "x-auth-token": token,
      };

      const createRes = await fetch("/api/payments/razorpay/boost/create", {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({
          boostPlanId: plan._id,
          propertyId: selectedProperty._id,
        }),
      });

      const createJson = await createRes.json();
      if (!createRes.ok || !createJson?.success) {
        alert(createJson?.error || "Failed to create order");
        return;
      }

      const order = createJson.data;

      const rzp = new (window as any).Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency || "INR",
        name: "Ashish Properties",
        description: `Boost: ${plan.name}`,
        order_id: order.razorpayOrderId,
        notes: { boostPlanId: plan._id, propertyId: selectedProperty._id },
        theme: { color: "#EAB308" },
        prefill: {},
        handler: async (response: any) => {
          try {
            const verifyRes = await fetch("/api/payments/razorpay/boost/verify", {
              method: "POST",
              credentials: "include",
              headers,
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                transactionId: order.transactionId,
              }),
            });
            const verifyJson = await verifyRes.json();
            if (verifyJson?.success) {
              alert("Boost applied successfully!");
              setBoostModalOpen(false);
              fetchUserData();
            } else {
              alert(verifyJson?.error || "Payment verification failed");
            }
          } catch (err) {
            alert("Payment verification failed");
          }
        },
        modal: {
          ondismiss: () => {},
          escape: true,
          backdropclose: false,
        },
      });

      rzp.on("payment.failed", (response: any) => {
        alert(response.error?.description || "Payment failed");
      });

      rzp.open();
    } catch (error) {
      console.error("Boost payment error:", error);
      alert("Failed to process payment. Please try again.");
    }
  };

  const filteredProperties = properties.filter((p) =>
    p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.location?.address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/user-login");
        return;
      }

      // Fetch both properties and notifications
      const [propertiesRes, notificationsRes] = await Promise.all([
        api.get("/user/properties", token),
        api.get("/user/notifications", token),
      ]);

      // Handle properties
      if (propertiesRes.data.success) {
        const userProperties = propertiesRes.data.data as Property[];
        setProperties(userProperties);

        // Handle notifications
        if (notificationsRes.data.success) {
          setNotifications(notificationsRes.data.data || []);
        }

        // Calculate stats
        const totalViews = userProperties.reduce(
          (sum, prop) => sum + prop.views,
          0,
        );
        const totalInquiries = userProperties.reduce(
          (sum, prop) => sum + prop.inquiries,
          0,
        );
        const unreadNotifications = (notificationsRes.data.data || []).filter(
          (n: Notification) => !n.isRead,
        ).length;

        setStats({
          totalProperties: userProperties.length,
          pendingApproval: userProperties.filter(
            (p) => p.approvalStatus === "pending",
          ).length,
          approved: userProperties.filter(
            (p) => p.approvalStatus === "approved",
          ).length,
          rejected: userProperties.filter(
            (p) => p.approvalStatus === "rejected",
          ).length,
          premiumListings: userProperties.filter((p) => p.premium).length,
          premiumPending: userProperties.filter(
            (p) => p.premium && p.premiumApprovalStatus === "pending",
          ).length,
          premiumApproved: userProperties.filter(
            (p) => p.premium && p.premiumApprovalStatus === "approved",
          ).length,
          totalViews,
          totalInquiries,
          unreadNotifications,
        });
      }
    } catch (error: any) {
      console.error("Error fetching user properties:", error);

      // Handle token expiration/invalid token
      if (
        error.message.includes("401") ||
        error.message.includes("403") ||
        error.message.includes("token")
      ) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/user-login");
        return;
      }

      // Show user-friendly error message
      alert("Failed to load your properties. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const token = localStorage.getItem("token");
      await api.put(`/user/notifications/${notificationId}/read`, {}, token);
      setNotifications(
        notifications.map((n) =>
          n._id === notificationId ? { ...n, isRead: true } : n,
        ),
      );
      // Update stats
      setStats((prev) => ({
        ...prev,
        unreadNotifications: prev.unreadNotifications - 1,
      }));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const token = localStorage.getItem("token");
      await api.delete(`/user/notifications/${notificationId}`, token);
      const deletedNotification = notifications.find(
        (n) => n._id === notificationId,
      );
      setNotifications(notifications.filter((n) => n._id !== notificationId));
      // Update stats if deleted notification was unread
      if (deletedNotification && !deletedNotification.isRead) {
        setStats((prev) => ({
          ...prev,
          unreadNotifications: prev.unreadNotifications - 1,
        }));
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "welcome":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "property":
        return <Home className="h-4 w-4 text-blue-500" />;
      case "message":
        return <MessageSquare className="h-4 w-4 text-purple-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            Pending Review
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="bg-red-100 text-red-800">
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getPremiumBadge = (property: Property) => {
    if (!property.premium) return null;

    switch (property.premiumApprovalStatus) {
      case "pending":
        return (
          <Badge className="bg-orange-100 text-orange-800 border-orange-300">
            <svg
              className="h-3 w-3 mr-1"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            Premium Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-yellow-500">
            <svg
              className="h-3 w-3 mr-1"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            Premium Active
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-300">
            <svg
              className="h-3 w-3 mr-1"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            Premium Rejected
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
            <svg
              className="h-3 w-3 mr-1"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            Premium
          </Badge>
        );
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <OLXStyleHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <OLXStyleHeader />

      <div className="container mx-auto px-4 py-8 pb-20">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome back, {user?.name}!
            </h1>
            <p className="text-gray-600">
              Manage your properties and track your listings
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex flex-col sm:flex-row gap-2">
            {/* Notification Bell */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab("notifications")}
                className="relative"
              >
                <Bell className="h-4 w-4" />
                {stats.unreadNotifications > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 text-xs bg-red-500 text-white rounded-full flex items-center justify-center">
                    {stats.unreadNotifications}
                  </Badge>
                )}
              </Button>
            </div>

            <Button
              asChild
              className="bg-[#C70000] hover:bg-[#A50000] text-white"
            >
              <Link to="/post-property">
                <Plus className="h-4 w-4 mr-2" />
                Post New Property
              </Link>
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Basic Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <Card
            className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:bg-gray-50"
            onClick={() => navigate("/account/my-ads")}
          >
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-[#C70000] mb-1">
                {stats.totalProperties}
              </div>
              <div className="text-sm text-gray-600">Total Properties</div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:bg-yellow-50"
            onClick={() => navigate("/account/my-ads?status=pending")}
          >
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600 mb-1">
                {stats.pendingApproval}
              </div>
              <div className="text-sm text-gray-600">Pending Review</div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:bg-green-50"
            onClick={() => navigate("/account/my-ads?status=approved")}
          >
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600 mb-1">
                {stats.approved}
              </div>
              <div className="text-sm text-gray-600">Approved</div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:bg-blue-50"
            onClick={() => navigate("/account/my-ads?sort=views")}
          >
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {stats.totalViews}
              </div>
              <div className="text-sm text-gray-600">Total Views</div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:bg-purple-50"
            onClick={() => navigate("/account/my-ads")}
          >
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600 mb-1">
                {stats.totalInquiries}
              </div>
              <div className="text-sm text-gray-600">Inquiries</div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all duration-200 ${
              activeTab === "notifications"
                ? "border-blue-500 bg-blue-50"
                : "hover:shadow-lg hover:bg-gray-50"
            }`}
            onClick={() => setActiveTab("notifications")}
          >
            <CardContent className="p-4 text-center">
              <div className="relative">
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  {notifications.length}
                </div>
                <div className="text-sm text-gray-600">Notifications</div>
                {stats.unreadNotifications > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-4 w-4 text-xs bg-red-500 text-white rounded-full flex items-center justify-center">
                    {stats.unreadNotifications}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Premium Listings Section */}
        {stats.premiumListings > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
              <svg
                className="h-5 w-5 text-yellow-600 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              Premium Listings
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-600 mb-1">
                    {stats.premiumListings}
                  </div>
                  <div className="text-sm text-gray-600">Total Premium</div>
                </CardContent>
              </Card>

              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-orange-600 mb-1">
                    {stats.premiumPending}
                  </div>
                  <div className="text-sm text-gray-600">Pending Approval</div>
                </CardContent>
              </Card>

              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600 mb-1">
                    {stats.premiumApproved}
                  </div>
                  <div className="text-sm text-gray-600">Approved</div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Notifications Section */}
        {activeTab === "notifications" && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <span>Notifications</span>
                {stats.unreadNotifications > 0 && (
                  <Badge className="bg-red-500 text-white">
                    {stats.unreadNotifications} unread
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {notifications.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500">No notifications yet</p>
                  <p className="text-gray-400 text-sm">
                    We'll notify you about important updates
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((notification) => (
                    <div
                      key={notification._id}
                      className={`border rounded-lg p-4 ${
                        notification.isRead
                          ? "bg-gray-50"
                          : "bg-blue-50 border-blue-200"
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex items-start space-x-3 flex-1">
                          {getNotificationIcon(notification.type)}
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">
                              {notification.title}
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-400 mt-2">
                              {new Date(
                                notification.createdAt,
                              ).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {!notification.isRead && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                markNotificationAsRead(notification._id)
                              }
                              className="text-xs"
                            >
                              Mark as Read
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteNotification(notification._id)}
                            className="text-xs text-red-600 hover:text-red-700"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* My Properties Section */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                All Properties
                <span className="text-sm font-normal text-gray-500">
                  ({filteredProperties.length} of {properties.length})
                </span>
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by title or address..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-48 md:w-64"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                  onClick={() => setBoostModalOpen(true)}
                >
                  <Zap className="h-4 w-4 mr-1" />
                  Boost Ups
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-purple-500 text-purple-600 hover:bg-purple-50"
                >
                  <Crown className="h-4 w-4 mr-1" />
                  Premium
                </Button>
                <Button asChild size="sm" className="bg-[#C70000] hover:bg-[#A50000]">
                  <Link to="/post-property">
                    <Plus className="h-4 w-4 mr-1" />
                    Add New Property
                  </Link>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredProperties.length === 0 ? (
              <div className="text-center py-12">
                <Home className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No properties yet
                </h3>
                <p className="text-gray-600 mb-6">
                  Start by posting your first property
                </p>
                <Button asChild className="bg-[#C70000] hover:bg-[#A50000]">
                  <Link to="/post-property">
                    <Plus className="h-4 w-4 mr-2" />
                    Post Your First Property
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredProperties.map((property) => (
                  <div
                    key={property._id}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col lg:flex-row gap-4">
                      {/* Property Image */}
                      <div className="w-full lg:w-48 h-32 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                        {property.images && property.images.length > 0 ? (
                          <img
                            src={property.images[0]}
                            alt={property.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Home className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* Property Details */}
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-2">
                          <h3 className="font-semibold text-lg">
                            {property.title}
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {getStatusBadge(
                              property.approvalStatus || "pending",
                            )}
                            {getPremiumBadge(property)}
                            {property.boosted && property.boostEndTime && new Date(property.boostEndTime) > new Date() && (
                              <Badge className="bg-yellow-500 text-white">
                                <Zap className="h-3 w-3 mr-1" />
                                Boosted
                              </Badge>
                            )}
                          </div>
                        </div>

                        <p className="text-gray-600 mb-2 line-clamp-2">
                          {property.description}
                        </p>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-3">
                          <span className="font-semibold text-[#C70000] text-lg">
                            ₹{property.price.toLocaleString()}{" "}
                            {property.priceType === "rent" ? "/month" : ""}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="h-4 w-4" />
                            {property.views} views
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-4 w-4" />
                            {property.inquiries} inquiries
                          </span>
                          <span>{property.location.address}</span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {property.approvalStatus === "approved" && !property.boosted && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleBoostProperty(property)}
                              className="border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                            >
                              <Zap className="h-3 w-3 mr-1" />
                              Boost
                            </Button>
                          )}
                          {property.approvalStatus === "approved" && !property.featured && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleFeaturedProperty(property)}
                              className="border-blue-500 text-blue-600 hover:bg-blue-50"
                            >
                              <Crown className="h-3 w-3 mr-1" />
                              Featured
                            </Button>
                          )}
                        </div>

                        {/* Rejection Reason */}
                        {property.approvalStatus === "rejected" &&
                          property.rejectionReason && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                              <p className="text-sm text-red-800">
                                <strong>Rejection Reason:</strong>{" "}
                                {property.rejectionReason}
                              </p>
                            </div>
                          )}

                        {/* Admin Comments */}
                        {property.adminComments && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                            <p className="text-sm text-blue-800">
                              <strong>Admin Note:</strong>{" "}
                              {property.adminComments}
                            </p>
                          </div>
                        )}

                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500">
                            Posted{" "}
                            {new Date(property.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => navigate("/my-account")}
          >
            <CardContent className="p-6 text-center">
              <User className="h-8 w-8 text-[#C70000] mx-auto mb-2" />
              <h3 className="font-semibold mb-1">Profile</h3>
              <p className="text-sm text-gray-600">Manage your account</p>
            </CardContent>
          </Card>

          <Card
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => navigate("/favorites")}
          >
            <CardContent className="p-6 text-center">
              <Heart className="h-8 w-8 text-[#C70000] mx-auto mb-2" />
              <h3 className="font-semibold mb-1">Favorites</h3>
              <p className="text-sm text-gray-600">Saved properties</p>
            </CardContent>
          </Card>

          <Card
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => navigate("/messages")}
          >
            <CardContent className="p-6 text-center">
              <MessageSquare className="h-8 w-8 text-[#C70000] mx-auto mb-2" />
              <h3 className="font-semibold mb-1">Messages</h3>
              <p className="text-sm text-gray-600">Chat with buyers</p>
            </CardContent>
          </Card>

          <Card
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => navigate("/settings")}
          >
            <CardContent className="p-6 text-center">
              <Settings className="h-8 w-8 text-[#C70000] mx-auto mb-2" />
              <h3 className="font-semibold mb-1">Settings</h3>
              <p className="text-sm text-gray-600">Account preferences</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <BottomNavigation />

      {/* Boost Plans Modal */}
      <Dialog open={boostModalOpen} onOpenChange={setBoostModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              {selectedProperty ? `Boost: ${selectedProperty.title}` : "Available Boost Plans"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {boostPlans.map((plan) => (
              <Card key={plan._id} className="border-2 hover:border-yellow-500 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-5 w-5 text-yellow-500" />
                    <h3 className="font-semibold">{plan.name}</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{plan.description}</p>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl font-bold text-[#C70000]">₹{plan.price}</span>
                    <span className="text-sm text-gray-500">{plan.duration} hours</span>
                  </div>
                  <ul className="text-sm space-y-1 mb-4">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full bg-yellow-500 hover:bg-yellow-600 text-black"
                    onClick={() => selectedProperty ? applyBoost(plan) : setBoostModalOpen(false)}
                    disabled={!selectedProperty}
                  >
                    {selectedProperty ? "Buy & Apply" : "Select a property first"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          {boostPlans.length === 0 && (
            <div className="text-center py-8">
              <Zap className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No boost plans available yet</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Featured Plans Modal */}
      <Dialog open={featuredModalOpen} onOpenChange={setFeaturedModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-blue-500" />
              {selectedProperty ? `Featured: ${selectedProperty.title}` : "Available Featured Plans"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 mb-4">
            After purchasing a featured plan, your property will be reviewed by admin. Once approved, it will appear in the Featured Properties section on the homepage.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {featuredPlans.map((plan) => (
              <Card key={plan._id} className="border-2 hover:border-blue-500 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="h-5 w-5 text-blue-500" />
                    <h3 className="font-semibold">{plan.name}</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{plan.description}</p>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl font-bold text-[#C70000]">₹{plan.price}</span>
                    <span className="text-sm text-gray-500">{plan.duration} days</span>
                  </div>
                  <ul className="text-sm space-y-1 mb-4">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                    onClick={() => selectedProperty ? applyFeatured(plan._id) : setFeaturedModalOpen(false)}
                    disabled={!selectedProperty || applyingFeatured}
                  >
                    {applyingFeatured ? "Processing..." : selectedProperty ? "Apply Featured" : "Select a property first"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          {featuredPlans.length === 0 && (
            <div className="text-center py-8">
              <Crown className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No featured plans available yet</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserDashboard;
