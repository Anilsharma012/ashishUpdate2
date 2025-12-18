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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { CreditCard, ArrowLeft, Download } from "lucide-react";
import OLXStyleHeader from "../components/OLXStyleHeader";
import BottomNavigation from "../components/BottomNavigation";

interface Payment {
  _id?: string;
  id?: string;
  transactionId: string;
  package: string;
  amount: number;
  paymentMethod: string;
  status: "completed" | "pending" | "failed";
  date: string;
  createdAt?: string;
}

export default function SellerPaymentsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }
    if (user.userType !== "seller") {
      navigate("/seller-dashboard", { replace: true });
      return;
    }
    fetchPayments();
  }, [user, navigate]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/api/seller/payments");
      const payments = Array.isArray(response.data)
        ? response.data
        : response.data?.data || [];
      setPayments(payments);
    } catch (err: any) {
      console.error("Error fetching payments:", err);
      setError(err?.response?.data?.message || "Failed to load payments");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            Completed
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
            Pending
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive" className="bg-red-100 text-red-800">
            Failed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const totalAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

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
            <h1 className="text-3xl font-bold text-gray-900">Payments</h1>
            <p className="text-gray-600 mt-1">
              View and manage your payment history
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
              <CreditCard className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₹{totalAmount.toLocaleString()}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {payments.length} transaction{payments.length !== 1 ? "s" : ""}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Completed Payments
              </CardTitle>
              <CreditCard className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {payments.filter((p) => p.status === "completed").length}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                ₹
                {payments
                  .filter((p) => p.status === "completed")
                  .reduce((sum, p) => sum + (p.amount || 0), 0)
                  .toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Payments table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5" />
                <span>Payment History</span>
              </CardTitle>
              <Button variant="outline" size="sm" onClick={fetchPayments}>
                Refresh
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="text-gray-500">Loading payments...</div>
              </div>
            ) : payments.length === 0 ? (
              <div className="text-center py-8">
                <CreditCard className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500">No payments found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>Package</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment: any, idx) => {
                      const id = payment._id || payment.id;
                      const dateStr =
                        payment.date ||
                        payment.createdAt ||
                        new Date().toISOString();
                      return (
                        <TableRow key={id || idx}>
                          <TableCell className="font-mono text-sm">
                            {payment.transactionId}
                          </TableCell>
                          <TableCell>{payment.package}</TableCell>
                          <TableCell className="font-bold text-[#C70000]">
                            ₹{(payment.amount || 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="capitalize">
                            {payment.paymentMethod}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(payment.status)}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {new Date(dateStr).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs"
                            >
                              <Download className="h-3 w-3" />
                            </Button>
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

      <BottomNavigation />
    </div>
  );
}
