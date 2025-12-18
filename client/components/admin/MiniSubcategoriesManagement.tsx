import React, { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Plus, Edit2, Trash2, Save, X, ChevronDown, ChevronUp } from "lucide-react";
import { MiniSubcategory, Subcategory, Category } from "@shared/types";
import { safeReadResponse, getApiErrorMessage } from "../../lib/response-utils";

export default function MiniSubcategoriesManagement() {
  const { token } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [miniSubcategories, setMiniSubcategories] = useState<MiniSubcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingMini, setEditingMini] = useState<MiniSubcategory | null>(null);
  const [expandedSubcategories, setExpandedSubcategories] = useState<Set<string>>(
    new Set(),
  );
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    sortOrder: 0,
    active: true,
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      fetchSubcategories(selectedCategory);
    } else {
      setSubcategories([]);
      setMiniSubcategories([]);
    }
  }, [selectedCategory]);

  useEffect(() => {
    if (selectedSubcategory) {
      fetchMiniSubcategories(selectedSubcategory);
    } else {
      setMiniSubcategories([]);
    }
  }, [selectedSubcategory]);

  const fetchCategories = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const response = await fetch("/api/admin/categories?withSub=true", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const { ok, data } = await safeReadResponse(response);
      if (ok && data.success && Array.isArray(data.data)) {
        setCategories(data.data);
        setError("");
      } else {
        setError("Failed to fetch categories");
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      setError("Failed to fetch categories");
    } finally {
      setLoading(false);
    }
  };

  const fetchSubcategories = async (categoryId: string) => {
    if (!token) return;
    try {
      const response = await fetch(
        `/api/admin/subcategories/by-category/${categoryId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const { ok, data } = await safeReadResponse(response);
      if (ok && data.success) {
        setSubcategories(data.data || []);
        setError("");
      } else {
        setError("Failed to fetch subcategories");
      }
    } catch (error) {
      console.error("Error fetching subcategories:", error);
      setError("Failed to fetch subcategories");
    }
  };

  const fetchMiniSubcategories = async (subcategoryId: string) => {
    if (!token) return;
    try {
      const response = await fetch(
        `/api/admin/mini-subcategories/by-subcategory/${subcategoryId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const { ok, data } = await safeReadResponse(response);
      if (ok && data.success) {
        setMiniSubcategories(data.data || []);
        setError("");
      } else {
        setError("Failed to fetch mini-subcategories");
      }
    } catch (error) {
      console.error("Error fetching mini-subcategories:", error);
      setError("Failed to fetch mini-subcategories");
    }
  };

  const handleCreate = async () => {
    if (!token || !formData.name || !selectedSubcategory) {
      setError("Please fill in all required fields: name and subcategory");
      return;
    }

    // Auto-generate slug if not provided
    const slug = formData.slug || generateSlug(formData.name);

    try {
      const response = await fetch("/api/admin/mini-subcategories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subcategoryId: selectedSubcategory,
          name: formData.name,
          slug,
          description: formData.description,
          sortOrder: formData.sortOrder,
          active: formData.active,
        }),
      });

      const { ok, status, data } = await safeReadResponse(response);

      if (ok && data.success) {
        await fetchMiniSubcategories(selectedSubcategory);
        setShowCreateForm(false);
        setFormData({
          name: "",
          slug: "",
          description: "",
          sortOrder: 0,
          active: true,
        });
        setError("");
      } else {
        setError(getApiErrorMessage(data, status, "create mini-subcategory"));
      }
    } catch (error) {
      console.error("Error creating mini-subcategory:", error);
      setError("Failed to create mini-subcategory");
    }
  };

  const handleUpdate = async () => {
    if (!token || !editingMini || !formData.name || !formData.slug) {
      setError("Please fill in all required fields");
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/mini-subcategories/${editingMini._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: formData.name,
            slug: formData.slug,
            description: formData.description,
            sortOrder: formData.sortOrder,
            active: formData.active,
          }),
        },
      );

      const { ok, status, data } = await safeReadResponse(response);

      if (ok && data.success) {
        if (selectedSubcategory) {
          await fetchMiniSubcategories(selectedSubcategory);
        }
        setEditingMini(null);
        setShowCreateForm(false);
        setFormData({
          name: "",
          slug: "",
          description: "",
          sortOrder: 0,
          active: true,
        });
        setError("");
      } else {
        setError(getApiErrorMessage(data, status, "update mini-subcategory"));
      }
    } catch (error) {
      console.error("Error updating mini-subcategory:", error);
      setError("Failed to update mini-subcategory");
    }
  };

  const handleDelete = async (miniId: string) => {
    if (!token || !confirm("Are you sure you want to delete this mini-subcategory?")) {
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/mini-subcategories/${miniId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const { ok, status, data } = await safeReadResponse(response);

      if (ok && data.success) {
        if (selectedSubcategory) {
          await fetchMiniSubcategories(selectedSubcategory);
        }
        setError("");
      } else {
        setError(getApiErrorMessage(data, status, "delete mini-subcategory"));
      }
    } catch (error) {
      console.error("Error deleting mini-subcategory:", error);
      setError("Failed to delete mini-subcategory");
    }
  };

  const handleToggleActive = async (miniId: string) => {
    if (!token) return;

    try {
      const response = await fetch(
        `/api/admin/mini-subcategories/${miniId}/toggle`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const { ok, data } = await safeReadResponse(response);

      if (ok && data.success) {
        if (selectedSubcategory) {
          await fetchMiniSubcategories(selectedSubcategory);
        }
        setError("");
      }
    } catch (error) {
      console.error("Error toggling mini-subcategory status:", error);
    }
  };

  const startEdit = (mini: MiniSubcategory) => {
    setEditingMini(mini);
    setFormData({
      name: mini.name,
      slug: mini.slug,
      description: mini.description || "",
      sortOrder: mini.sortOrder || 0,
      active: mini.active !== false,
    });
    setShowCreateForm(true);
  };

  const cancelEdit = () => {
    setEditingMini(null);
    setShowCreateForm(false);
    setFormData({
      name: "",
      slug: "",
      description: "",
      sortOrder: 0,
      active: true,
    });
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const toggleSubcategoryExpanded = (subId: string) => {
    const newSet = new Set(expandedSubcategories);
    if (newSet.has(subId)) {
      newSet.delete(subId);
    } else {
      newSet.add(subId);
    }
    setExpandedSubcategories(newSet);
  };

  const category = categories.find((c) => c._id === selectedCategory);
  const subcategory = subcategories.find((s) => s._id === selectedSubcategory);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-gray-500">Loading categories...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Mini-Subcategory Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-2 rounded">
              {error}
            </div>
          )}

          {/* Category Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Category <span className="text-red-500">*</span>
            </label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat._id} value={cat._id || ""}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Subcategory Selection */}
          {selectedCategory && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Subcategory <span className="text-red-500">*</span>
              </label>
              <Select value={selectedSubcategory} onValueChange={setSelectedSubcategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a subcategory" />
                </SelectTrigger>
                <SelectContent>
                  {subcategories.map((sub) => (
                    <SelectItem key={sub._id} value={sub._id || ""}>
                      {sub.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Mini-Subcategories List */}
          {selectedSubcategory && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-lg">
                  Mini-Subcategories for {subcategory?.name}
                </h3>
                <Button
                  onClick={() => {
                    setEditingMini(null);
                    setShowCreateForm(!showCreateForm);
                    setFormData({
                      name: "",
                      slug: "",
                      description: "",
                      sortOrder: 0,
                      active: true,
                    });
                  }}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Mini-Subcategory
                </Button>
              </div>

              {/* Create/Edit Form */}
              {showCreateForm && (
                <Card className="mb-4 bg-gray-50">
                  <CardContent className="pt-6 space-y-4">
                    <Input
                      placeholder="Name *"
                      value={formData.name}
                      onChange={(e) => {
                        const name = e.target.value;
                        // Auto-generate slug from name if slug is empty or was previously auto-generated
                        const newSlug = !formData.slug || formData.slug === generateSlug(formData.name)
                          ? generateSlug(name)
                          : formData.slug;
                        setFormData({ ...formData, name, slug: newSlug })
                      }}
                    />

                    <Input
                      placeholder="Slug (optional - auto-generated from name if empty)"
                      value={formData.slug}
                      onChange={(e) =>
                        setFormData({ ...formData, slug: e.target.value })
                      }
                    />

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          slug: generateSlug(formData.name),
                        })
                      }
                    >
                      Auto-generate Slug
                    </Button>

                    <Input
                      placeholder="Description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                    />

                    <Input
                      type="number"
                      placeholder="Sort Order"
                      value={formData.sortOrder}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          sortOrder: parseInt(e.target.value) || 0,
                        })
                      }
                    />

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="active"
                        checked={formData.active}
                        onChange={(e) =>
                          setFormData({ ...formData, active: e.target.checked })
                        }
                      />
                      <label htmlFor="active" className="text-sm font-medium">
                        Active
                      </label>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={editingMini ? handleUpdate : handleCreate}>
                        <Save className="w-4 h-4 mr-2" />
                        {editingMini ? "Update" : "Create"}
                      </Button>
                      <Button variant="outline" onClick={cancelEdit}>
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Mini-Subcategories Table */}
              {miniSubcategories.length > 0 ? (
                <div className="space-y-2">
                  {miniSubcategories.map((mini) => (
                    <Card key={mini._id}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold">{mini.name}</h4>
                            <p className="text-sm text-gray-600">{mini.slug}</p>
                            {mini.description && (
                              <p className="text-sm text-gray-500">{mini.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={mini.active !== false ? "default" : "secondary"}
                            >
                              {mini.active !== false ? "Active" : "Inactive"}
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => startEdit(mini)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(mini._id || "")}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant={
                                mini.active !== false ? "default" : "secondary"
                              }
                              size="sm"
                              onClick={() =>
                                handleToggleActive(mini._id || "")
                              }
                            >
                              {mini.active !== false ? "Disable" : "Enable"}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No mini-subcategories yet. Create one to get started!
                </div>
              )}
            </div>
          )}

          {!selectedSubcategory && selectedCategory && (
            <div className="text-center text-gray-500 py-8">
              Select a subcategory to manage its mini-subcategories
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
