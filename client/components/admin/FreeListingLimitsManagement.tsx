import { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { Settings, Plus, Edit, Save, X, Search, Filter } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { useToast } from "../../hooks/use-toast";

interface UserListingStat {
  _id: string;
  name: string;
  email: string;
  phone: string;
  userType: string;
  totalListings: number;
  freeListingsInPeriod: number;
  freeListingLimit: {
    limit: number;
    period: "monthly" | "yearly";
    limitType: number;
  };
  createdAt: string;
}

interface AdminSettings {
  defaultLimit: number;
  defaultPeriod: "monthly" | "yearly";
  defaultLimitType: number;
}

export default function FreeListingLimitsManagement() {
  const { token } = useAuth();
  const { toast } = useToast();

  const [users, setUsers] = useState<UserListingStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });

  const [adminSettings, setAdminSettings] = useState<AdminSettings>({
    defaultLimit: 5,
    defaultPeriod: "monthly",
    defaultLimitType: 30,
  });

  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [tempSettings, setTempSettings] =
    useState<AdminSettings>(adminSettings);
  const [savingSettings, setSavingSettings] = useState(false);

  const [editingUser, setEditingUser] = useState<UserListingStat | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editLimit, setEditLimit] = useState(5);
  const [editPeriod, setEditPeriod] = useState<"monthly" | "yearly">("monthly");
  const [savingUser, setSavingUser] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchAdminSettings();
  }, [token, pagination.page]);

  const fetchUsers = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        search: searchTerm,
      });

      const url = `/api/admin/users/listing-stats?${params}`;
      console.log("Fetching URL:", url);
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const text = await response.text();
        console.error("API Error:", {
          status: response.status,
          statusText: response.statusText,
          body: text,
        });
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      setUsers(result.data || []);
      setPagination(result.pagination);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error",
        description: `Failed to fetch users: ${(error as any)?.message || "Unknown error"}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminSettings = async () => {
    if (!token) return;

    try {
      const response = await fetch("/api/admin/free-listing-settings", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const text = await response.text();
        console.error("API Error:", {
          status: response.status,
          statusText: response.statusText,
          body: text,
        });
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      setAdminSettings(result.data);
      setTempSettings(result.data);
    } catch (error) {
      console.error("Error fetching admin settings:", error);
      toast({
        title: "Error",
        description: `Failed to fetch settings: ${(error as any)?.message || "Unknown error"}`,
        variant: "destructive",
      });
    }
  };

  const handleUpdateSettings = async () => {
    if (!token) return;

    try {
      setSavingSettings(true);
      const response = await fetch("/api/admin/free-listing-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          limit: tempSettings.defaultLimit,
          period: tempSettings.defaultPeriod,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error("API Error:", {
          status: response.status,
          statusText: response.statusText,
          body: text,
        });
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      setAdminSettings(tempSettings);
      setShowSettingsDialog(false);
      toast({
        title: "Success",
        description: "Default free listing limits updated successfully",
      });
    } catch (error) {
      console.error("Error updating settings:", error);
      toast({
        title: "Error",
        description: `Failed to update settings: ${(error as any)?.message || "Unknown error"}`,
        variant: "destructive",
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleEditUser = (user: UserListingStat) => {
    setEditingUser(user);
    setEditLimit(user.freeListingLimit.limit);
    setEditPeriod(user.freeListingLimit.period);
    setShowEditDialog(true);
  };

  const handleUpdateUserLimit = async () => {
    if (!token || !editingUser) return;

    try {
      setSavingUser(true);
      const response = await fetch(
        `/api/admin/users/${editingUser._id}/free-listing-limit`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            limit: editLimit,
            period: editPeriod,
          }),
        },
      );

      if (!response.ok) throw new Error("Failed to update user limit");

      setShowEditDialog(false);
      setEditingUser(null);
      toast({
        title: "Success",
        description: `Free listing limit updated for ${editingUser.name}`,
      });
      fetchUsers();
    } catch (error) {
      console.error("Error updating user limit:", error);
      toast({
        title: "Error",
        description: "Failed to update user free listing limit",
        variant: "destructive",
      });
    } finally {
      setSavingUser(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setPagination({ ...pagination, page: 1 });
  };

  const getRemainingListings = (user: UserListingStat) => {
    return Math.max(0, user.freeListingLimit.limit - user.freeListingsInPeriod);
  };

  return (
    <div className="space-y-6">
      {/* Admin Settings Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Default Free Listing Settings
          </CardTitle>
          <Button
            onClick={() => setShowSettingsDialog(true)}
            size="sm"
            variant="outline"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Defaults
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Default Limit</p>
              <p className="text-2xl font-bold">{adminSettings.defaultLimit}</p>
              <p className="text-xs text-gray-500">listings</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Period</p>
              <p className="text-2xl font-bold capitalize">
                {adminSettings.defaultPeriod}
              </p>
              <p className="text-xs text-gray-500">
                ({adminSettings.defaultLimitType} days)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users with Listing Stats */}
      <Card>
        <CardHeader className="space-y-4">
          <CardTitle>User Listing Stats & Management</CardTitle>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchTerm}
                onChange={handleSearch}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No users found</div>
          ) : (
            <>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Total Listings</TableHead>
                      <TableHead>Free Listings (Period)</TableHead>
                      <TableHead>Limit</TableHead>
                      <TableHead>Remaining</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user._id}>
                        <TableCell className="font-medium">
                          {user.name}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.phone}</TableCell>
                        <TableCell>{user.totalListings}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {user.freeListingsInPeriod}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {user.freeListingLimit.limit}
                            </span>
                            <span className="text-xs text-gray-500 capitalize">
                              {user.freeListingLimit.period}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getRemainingListings(user) > 0 ? (
                            <Badge variant="default">
                              {getRemainingListings(user)}
                            </Badge>
                          ) : (
                            <Badge variant="destructive">0</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            onClick={() => handleEditUser(user)}
                            size="sm"
                            variant="ghost"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-600">
                  Page {pagination.page} of {pagination.pages} (
                  {pagination.total} total)
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() =>
                      setPagination({
                        ...pagination,
                        page: Math.max(1, pagination.page - 1),
                      })
                    }
                    disabled={pagination.page === 1}
                    variant="outline"
                    size="sm"
                  >
                    Previous
                  </Button>
                  <Button
                    onClick={() =>
                      setPagination({
                        ...pagination,
                        page: Math.min(pagination.pages, pagination.page + 1),
                      })
                    }
                    disabled={pagination.page === pagination.pages}
                    variant="outline"
                    size="sm"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Default Free Listing Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Free Listings Limit
              </label>
              <Input
                type="number"
                min="1"
                value={tempSettings.defaultLimit}
                onChange={(e) =>
                  setTempSettings({
                    ...tempSettings,
                    defaultLimit: parseInt(e.target.value) || 1,
                  })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Period</label>
              <Select
                value={tempSettings.defaultPeriod}
                onValueChange={(value) =>
                  setTempSettings({
                    ...tempSettings,
                    defaultPeriod: value as "monthly" | "yearly",
                    defaultLimitType: value === "monthly" ? 30 : 365,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly (30 days)</SelectItem>
                  <SelectItem value="yearly">Yearly (365 days)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setTempSettings(adminSettings);
                setShowSettingsDialog(false);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateSettings} disabled={savingSettings}>
              {savingSettings ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Limit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Update Free Listing Limit for {editingUser?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Free Listings Limit
              </label>
              <Input
                type="number"
                min="1"
                value={editLimit}
                onChange={(e) => setEditLimit(parseInt(e.target.value) || 1)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Period</label>
              <Select
                value={editPeriod}
                onValueChange={(value) =>
                  setEditPeriod(value as "monthly" | "yearly")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly (30 days)</SelectItem>
                  <SelectItem value="yearly">Yearly (365 days)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editingUser && (
              <div className="bg-gray-50 p-3 rounded text-sm">
                <p className="text-gray-600">Current Usage:</p>
                <p className="font-medium">
                  {editingUser.freeListingsInPeriod} /{" "}
                  {editingUser.freeListingLimit.limit} in{" "}
                  {editingUser.freeListingLimit.period}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateUserLimit} disabled={savingUser}>
              {savingUser ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
