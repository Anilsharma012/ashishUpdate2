import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import { AlertCircle, CheckCircle, Clock, Gift } from "lucide-react";
import { api } from "../lib/api";

interface FreeListingStats {
  freeListingsInPeriod: number;
  pendingFreeListings: number;
  remainingFreeListings: number;
  freeListingLimit: {
    limit: number;
    period: "monthly" | "yearly";
    limitType: number;
  };
}

interface FreeListingStatsCardProps {
  className?: string;
}

export const FreeListingStatsCard: React.FC<FreeListingStatsCardProps> = ({
  className = "",
}) => {
  const [stats, setStats] = useState<FreeListingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await api.get("/user/listing-stats");
        if (response.data?.success) {
          setStats(response.data.data);
          setError(null);
        } else {
          setError("Failed to load listing stats");
        }
      } catch (err) {
        console.error("Error fetching listing stats:", err);
        setError("Unable to load your listing stats");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Free Listing Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !stats) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Free Listing Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error || "Unable to load listing stats"}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const usagePercentage = Math.min(
    100,
    (stats.freeListingsInPeriod / stats.freeListingLimit.limit) * 100
  );
  const periodText =
    stats.freeListingLimit.period === "monthly" ? "month" : "year";
  const isLimitReached = stats.remainingFreeListings === 0;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-blue-500" />
          Free Listing Usage
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Used Listings */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <div className="text-sm text-gray-600 mb-1">Used This {periodText === "month" ? "Month" : "Year"}</div>
            <div className="text-3xl font-bold text-blue-600">
              {stats.freeListingsInPeriod}
            </div>
            <div className="text-xs text-gray-500 mt-1">free listings</div>
          </div>

          {/* Remaining Listings */}
          <div
            className={`rounded-lg p-4 border ${
              isLimitReached
                ? "bg-red-50 border-red-100"
                : "bg-green-50 border-green-100"
            }`}
          >
            <div className="text-sm text-gray-600 mb-1">Remaining</div>
            <div
              className={`text-3xl font-bold ${
                isLimitReached ? "text-red-600" : "text-green-600"
              }`}
            >
              {stats.remainingFreeListings}
            </div>
            <div className="text-xs text-gray-500 mt-1">free listings</div>
          </div>
        </div>

        {/* Pending Listings */}
        {stats.pendingFreeListings > 0 && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              {stats.pendingFreeListings} free{" "}
              {stats.pendingFreeListings === 1 ? "listing" : "listings"} pending
              approval
            </AlertDescription>
          </Alert>
        )}

        {/* Limit Information */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="text-sm text-gray-600 mb-2 font-medium">
            Your Free Listing Limit
          </div>
          <div className="text-lg font-semibold text-gray-900">
            {stats.freeListingLimit.limit} listings per {periodText}
          </div>

          {/* Progress Bar */}
          <div className="mt-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-gray-600">Usage</span>
              <span className="text-xs font-medium text-gray-700">
                {usagePercentage.toFixed(0)}%
              </span>
            </div>
            <div className="w-full bg-gray-300 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  usagePercentage < 75
                    ? "bg-green-500"
                    : usagePercentage < 100
                      ? "bg-yellow-500"
                      : "bg-red-500"
                }`}
                style={{ width: `${usagePercentage}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Warning or Success Message */}
        {isLimitReached && (
          <Alert className="bg-red-50 border-red-200">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              You've reached your free listing limit for this {periodText}. Consider upgrading to a paid package to post more listings.
            </AlertDescription>
          </Alert>
        )}

        {stats.remainingFreeListings > 0 && stats.remainingFreeListings <= 2 && (
          <Alert className="bg-yellow-50 border-yellow-200">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              You have only {stats.remainingFreeListings}{" "}
              {stats.remainingFreeListings === 1 ? "listing" : "listings"} left in your free quota
              this {periodText}.
            </AlertDescription>
          </Alert>
        )}

        {stats.remainingFreeListings > 0 && stats.remainingFreeListings > 2 && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              You have {stats.remainingFreeListings} free{" "}
              {stats.remainingFreeListings === 1 ? "listing" : "listings"} available
              this {periodText}.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
