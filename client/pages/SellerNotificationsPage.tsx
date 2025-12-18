import React, { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
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
  Bell,
  Check,
  X,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Info,
  MessageSquare,
} from "lucide-react";
import OLXStyleHeader from "../components/OLXStyleHeader";
import BottomNavigation from "../components/BottomNavigation";
import { toast } from "sonner";

interface Notification {
  _id?: string;
  id?: string;
  title: string;
  message: string;
  type: "approval" | "rejection" | "account" | "general" | string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
  propertyId?: string | null;
  propertyTitle?: string;
  conversationId?: string | null;
  source?: string;
}

export default function SellerNotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<
    Notification[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterType, setFilterType] = useState<"all" | "unread">("all");

  useEffect(() => {
    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }
    if (user.userType !== "seller") {
      navigate("/seller-dashboard", { replace: true });
      return;
    }
    fetchNotifications();
  }, [user, navigate]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/seller/notifications");
      const notifications = Array.isArray(response.data)
        ? response.data
        : response.data?.data || response.data?.notifications || [];
      setNotifications(notifications);
    } catch (err: any) {
      console.error("Error fetching notifications:", err);
      setError(err?.response?.data?.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = [...notifications];

    if (filterType === "unread") {
      filtered = filtered.filter((n) => !n.isRead);
    }

    setFilteredNotifications(filtered);
  }, [notifications, filterType]);

  const markAsRead = async (notificationId: string) => {
  try {
    await api.put(`/seller/notifications/${notificationId}/read`);
    setNotifications(
      notifications.map((n) =>
        (n._id || n.id) === notificationId ? { ...n, isRead: true } : n,
      ),
    );
    toast.success("Marked as read");
  } catch (err: any) {
    console.error("Error marking as read:", err);
    toast.error("Failed to mark as read");
  }
};


  const deleteNotification = async (
    notificationId: string,
    source?: string,
  ) => {
    try {
      const endpoint = source
  ? `/seller/notifications/${notificationId}?source=${source}`
  : `/seller/notifications/${notificationId}`;
await api.delete(endpoint);

      setNotifications(
        notifications.filter((n) => (n._id || n.id) !== notificationId),
      );
      toast.success("Notification deleted");
    } catch (err: any) {
      console.error("Error deleting notification:", err);
      toast.error("Failed to delete notification");
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "approval":
        return (
          <div className="flex-shrink-0">
            <CheckCircle className="h-5 w-5 text-green-500" />
          </div>
        );
      case "rejection":
        return (
          <div className="flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-red-500" />
          </div>
        );
      case "account":
        return (
          <div className="flex-shrink-0">
            <Info className="h-5 w-5 text-blue-500" />
          </div>
        );
      default:
        return (
          <div className="flex-shrink-0">
            <Bell className="h-5 w-5 text-gray-500" />
          </div>
        );
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

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
            <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
            <p className="text-gray-600 mt-1">
              {unreadCount > 0 ? (
                <>
                  You have{" "}
                  <span className="font-bold text-red-600">{unreadCount}</span>{" "}
                  unread notifications
                </>
              ) : (
                "All caught up!"
              )}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <Bell className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{notifications.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unread</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {unreadCount}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Read</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {notifications.filter((n) => n.isRead).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Notifications card */}
        <Card>
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <CardTitle className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <span>All Notifications</span>
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant={filterType === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterType("all")}
              >
                All ({notifications.length})
              </Button>
              <Button
                variant={filterType === "unread" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterType("unread")}
              >
                Unread ({unreadCount})
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="text-gray-500">Loading notifications...</div>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500">
                  {filterType === "unread"
                    ? "No unread notifications"
                    : "No notifications yet"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredNotifications.map((notification, idx) => {
                  const id =
                    (notification as any)._id || (notification as any).id;
                  return (
                    <div
                      key={id || idx}
                      className={`border rounded-lg p-4 transition-all duration-200 ${
                        notification.isRead
                          ? "bg-gray-50"
                          : "bg-blue-50 border-blue-200"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          {getNotificationIcon(notification.type)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-gray-900">
                                {notification.title}
                              </h4>
                              {!notification.isRead && (
                                <Badge className="bg-red-100 text-red-800">
                                  New
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {notification.message}
                            </p>
                            {notification.propertyTitle && (
                              <p className="text-xs text-gray-500 mt-2 font-semibold">
                                Property: {notification.propertyTitle}
                              </p>
                            )}
                            <p className="text-xs text-gray-400 mt-2">
                              {new Date(
                                notification.createdAt,
                              ).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                          {notification.conversationId && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                navigate(
                                  `/seller-dashboard/messages?id=${notification.conversationId}`,
                                )
                              }
                            >
                              <MessageSquare className="h-3 w-3" />
                            </Button>
                          )}

                          {!notification.isRead && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (!id) {
                                  toast.error("Notification id missing");
                                  return;
                                }
                                markAsRead(id);
                              }}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (!id) {
                                toast.error("Notification id missing");
                                return;
                              }
                              deleteNotification(id, notification.source);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <BottomNavigation />
    </div>
  );
}
