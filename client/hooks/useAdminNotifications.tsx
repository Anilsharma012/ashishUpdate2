import { useEffect, useState, useCallback } from "react";
import { useAuth } from "./useAuth";

export interface AdminNotificationCounts {
  pendingCount: number;
  resubmittedCount: number;
  reportsPending: number;
  bankTransfersPending: number;
  reviewsPending: number;
}

const DEFAULT_COUNTS: AdminNotificationCounts = {
  pendingCount: 0,
  resubmittedCount: 0,
  reportsPending: 0,
  bankTransfersPending: 0,
  reviewsPending: 0,
};

export function useAdminNotifications() {
  const { token } = useAuth();
  const [counts, setCounts] = useState<AdminNotificationCounts>(DEFAULT_COUNTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCounts = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/admin/notifications/counts", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch notification counts");
      }

      const data = await response.json();
      if (data.success && data.data) {
        setCounts(data.data);
        setError(null);
      }
    } catch (err) {
      console.error("Error fetching admin notification counts:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Fetch immediately on mount and when token changes
  useEffect(() => {
    fetchCounts();
  }, [token, fetchCounts]);

  // Poll for updates every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchCounts();
    }, 10000);

    // Listen for manual refresh events from other components
    const handleRefresh = () => {
      fetchCounts();
    };

    window.addEventListener("admin:notifications:refresh", handleRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener("admin:notifications:refresh", handleRefresh);
    };
  }, [fetchCounts]);

  const refresh = () => {
    fetchCounts();
  };

  return { counts, loading, error, refresh };
}
