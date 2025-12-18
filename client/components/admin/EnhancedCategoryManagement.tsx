import { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import {
  Layers,
  Edit,
  Trash2,
  Plus,
  Eye,
  Search,
  Upload,
  Save,
  X,
  ChevronUp,
  ChevronDown,
  Power,
  Image,
  Grid,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Textarea } from "../ui/textarea";
import { Switch } from "../ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { api } from "@/lib/api";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface MiniSubcategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  active?: boolean;
  count: number;
}

interface Subcategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  count: number;
  miniSubcategories?: MiniSubcategory[];
}

interface Category {
  _id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  subcategories: Subcategory[];
  order: number;
  active: boolean;
  count: number;
}

type EditableMiniSubcategory = {
  id?: string;
  name: string;
  slug: string;
  description?: string;
  imageFile?: File;
  active?: boolean;
};

type EditableSubcategory = {
  id?: string;
  name: string;
  slug: string;
  description?: string;
  imageFile?: File;
  miniSubcategories?: EditableMiniSubcategory[];
};

type NewCategoryState = {
  name: string;
  slug: string;
  description: string;
  icon: string;
  iconFile: File | null;
  subcategories: EditableSubcategory[];
  order: number;
  active: boolean;
};

/* ------------------------------------------------------------------ */
/* Normalizers (BACKEND <-> FRONTEND key mapping)                      */
/* Keep UI fields same: icon, order, active                            */
/* Backend may expect: iconUrl, sortOrder, isActive                    */
/* ------------------------------------------------------------------ */

const fromApi = (raw: any): Category => ({
  _id: raw?._id,
  name: raw?.name ?? "",
  slug: raw?.slug ?? "",
  icon: raw?.iconUrl ?? raw?.icon ?? "",
  description: raw?.description ?? "",
  subcategories: [],
  order: raw?.sortOrder ?? raw?.order ?? 0,
  active: raw?.isActive ?? raw?.active ?? true,
  count: raw?.count ?? 0,
});

const toApi = (cat: Partial<Category>) => {
  const out: any = {};
  if (cat.name !== undefined) out.name = cat.name;
  if (cat.slug !== undefined) out.slug = cat.slug;
  if (cat.description !== undefined) out.description = cat.description;
  if (cat.icon !== undefined) out.iconUrl = cat.icon;
  if (cat.order !== undefined) out.sortOrder = cat.order;
  if (cat.active !== undefined) out.isActive = cat.active;
  return out;
};

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function EnhancedCategoryManagement() {
  const { token } = useAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [uploading, setUploading] = useState(false);
  // Expand all subcategories by default to show mini-categories
  const [expandedSubcategories, setExpandedSubcategories] = useState<
    Set<string>
  >(new Set());
  const [editingMiniSubcategoryIndex, setEditingMiniSubcategoryIndex] =
    useState<number | null>(null);

  const [newCategory, setNewCategory] = useState<NewCategoryState>({
    name: "",
    slug: "",
    description: "",
    icon: "",
    iconFile: null,
    subcategories: [],
    order: 999,
    active: true,
  });

  /* ---------------------------------------------------------------- */
  /* Effects                                                          */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    const onUpdate = () => fetchCategories();
    window.addEventListener("categories:updated", onUpdate);
    window.addEventListener("subcategories:updated", onUpdate);
    fetchCategories();
    return () => {
      window.removeEventListener("categories:updated", onUpdate);
      window.removeEventListener("subcategories:updated", onUpdate);
    };
  }, [token]);

  /* ---------------------------------------------------------------- */
  /* Fetch list                                                       */
  /* ---------------------------------------------------------------- */

  const fetchCategories = async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError("");

      const res = await api.get("admin/categories?withSub=true", token);
      const data = res?.data;
      if (data?.success) {
        const rawList: any[] = Array.isArray(data.data)
          ? data.data
          : Array.isArray(data.data?.categories)
            ? data.data.categories
            : [];

        const list: Category[] = rawList.map((cat) => {
          const base = fromApi(cat);

          const subcategories: Subcategory[] = Array.isArray(cat.subcategories)
            ? cat.subcategories.map(
                (sub: any): Subcategory => ({
                  id:
                    sub._id?.toString?.() ||
                    sub.id ||
                    Math.random().toString(36).substr(2, 9),
                  name: sub.name || "",
                  slug: sub.slug || "",
                  description: sub.description || "",
                  image: sub.iconUrl || sub.icon || "",
                  count: sub.count || 0,
                  miniSubcategories: Array.isArray(sub.miniSubcategories)
                    ? sub.miniSubcategories.map(
                        (mini: any): MiniSubcategory => ({
                          id:
                            mini._id?.toString?.() ||
                            mini.id ||
                            Math.random().toString(36).substr(2, 9),
                          name: mini.name || "",
                          slug: mini.slug || "",
                          description: mini.description || "",
                          icon: mini.iconUrl || mini.icon || "",
                          active: mini.isActive ?? mini.active ?? true,
                          count: mini.count || 0,
                        }),
                      )
                    : [],
                }),
              )
            : [];

          return { ...base, subcategories };
        });

        setCategories(list.sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0)));
      } else {
        setError(data?.error || "Failed to fetch categories");
      }
    } catch (error: any) {
      console.error("Error fetching categories:", error?.message || error);
      setError(error?.message || "Failed to fetch categories");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------------------------------------------------------- */
  /* Uploads                                                          */
  /* ---------------------------------------------------------------- */

  const uploadIcon = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("icon", file);

    const { apiRequest } = await import("@/lib/api");
    const response = await apiRequest("admin/categories/upload-icon", {
      method: "POST",
      body: formData,
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error(response.data?.error || "Failed to upload icon");
    }

    return response.data?.data?.iconUrl || response.data?.iconUrl || "";
  };

  const uploadSubIcon = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("icon", file);

    const { apiRequest } = await import("@/lib/api");
    const response = await apiRequest("admin/categories/upload-icon", {
      method: "POST",
      body: formData,
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error(response.data?.error || "Failed to upload sub icon");
    }

    return response.data?.data?.iconUrl || response.data?.iconUrl || "";
  };

  /* ---------------------------------------------------------------- */
  /* MINI-SUBCATEGORY MANAGEMENT (NEW)                               */
  /* ---------------------------------------------------------------- */

  const addMiniSubcategory = (subcategoryIndex: number) => {
    setNewCategory((prev) => {
      const updatedSubcategories = [...prev.subcategories];
      const subcategory = updatedSubcategories[subcategoryIndex];

      if (!subcategory) {
        console.warn(`Subcategory at index ${subcategoryIndex} not found`);
        return prev;
      }

      const newMiniSubcategory: EditableMiniSubcategory = {
        name: "",
        slug: "",
        description: "",
        active: true,
      };

      updatedSubcategories[subcategoryIndex] = {
        ...subcategory,
        miniSubcategories: [
          ...(subcategory.miniSubcategories || []),
          newMiniSubcategory,
        ],
      };

      return { ...prev, subcategories: updatedSubcategories };
    });
  };

  const updateMiniSubcategory = (
    subcategoryIndex: number,
    miniIndex: number,
    field: keyof EditableMiniSubcategory,
    value: string | File | boolean,
  ) => {
    setNewCategory((prev) => {
      const updated = [...prev.subcategories];
      const subcat = { ...updated[subcategoryIndex] };
      const minis = [...(subcat.miniSubcategories || [])];
      const target = { ...minis[miniIndex] };

      if (field === "imageFile") {
        target.imageFile = value as File;
      } else if (field === "active") {
        target.active = value as boolean;
      } else {
        (target as any)[field] = value;
        if (field === "name") {
          target.slug = generateSlug(value as string);
        }
      }

      minis[miniIndex] = target;
      subcat.miniSubcategories = minis;
      updated[subcategoryIndex] = subcat;
      return { ...prev, subcategories: updated };
    });
  };

  const removeMiniSubcategory = async (
    subcategoryIndex: number,
    miniIndex: number,
  ) => {
    const sub = newCategory.subcategories[subcategoryIndex];
    const mini = sub.miniSubcategories?.[miniIndex];

    if (editingCategory && mini?.id && token) {
      try {
        const res = await api.delete(
          `admin/mini-subcategories/${mini.id}`,
          token,
        );
        if (!res?.data?.success) {
          throw new Error(
            res?.data?.error || "Failed to delete mini-subcategory",
          );
        }
        window.dispatchEvent(new Event("subcategories:updated"));
      } catch (error: any) {
        console.error(
          "Error deleting mini-subcategory:",
          error?.message || error,
        );
        setError(error?.message || "Failed to delete mini-subcategory");
        return;
      }
    }

    setNewCategory((prev) => {
      const updated = [...prev.subcategories];
      const subcat = { ...updated[subcategoryIndex] };
      subcat.miniSubcategories = (subcat.miniSubcategories || []).filter(
        (_, i) => i !== miniIndex,
      );
      updated[subcategoryIndex] = subcat;
      return { ...prev, subcategories: updated };
    });
  };

  /* ---------------------------------------------------------------- */
  /* CREATE                                                           */
  /* ---------------------------------------------------------------- */

  const createCategory = async () => {
    if (!token || !newCategory.name || !newCategory.slug) return;

    try {
      setUploading(true);
      let iconUrl = newCategory.icon;

      if (newCategory.iconFile) {
        iconUrl = await uploadIcon(newCategory.iconFile);
      }

      const categoryPayload = toApi({
        name: newCategory.name,
        slug: newCategory.slug,
        description: newCategory.description,
        icon: iconUrl || "/placeholder.svg",
        order: newCategory.order ?? 999,
        active: newCategory.active ?? true,
      });

      const created = await api.post(
        "admin/categories",
        categoryPayload,
        token,
      );
      const createdData = created?.data;
      if (!createdData?.success) {
        setError(createdData?.error || "Failed to create category");
        setUploading(false);
        return;
      }

      const createdCategory = createdData.data?.category || {
        _id: createdData.data?._id,
      };
      const categoryId = createdCategory._id;

      for (let i = 0; i < newCategory.subcategories.length; i++) {
        const sub = newCategory.subcategories[i];
        try {
          let subIconUrl = "";
          if (sub.imageFile) subIconUrl = await uploadSubIcon(sub.imageFile);

          const subRes = await api.post(
            "admin/subcategories",
            {
              categoryId,
              name: sub.name,
              slug: sub.slug,
              description: sub.description,
              iconUrl: subIconUrl || "/placeholder.svg",
              sortOrder: i + 1,
              isActive: true,
            },
            token,
          );

          if (!subRes?.data?.success) {
            console.warn("Failed to create subcategory", sub);
            continue;
          }

          const subcategoryId =
            subRes.data.data?._id || subRes.data.data?.subcategoryId;

          for (let j = 0; j < (sub.miniSubcategories?.length ?? 0); j++) {
            const mini = sub.miniSubcategories![j];
            if (!mini.name || !mini.slug) continue; // Skip empty mini-subcategories
            try {
              let miniIconUrl = "";
              if (mini.imageFile)
                miniIconUrl = await uploadSubIcon(mini.imageFile);

              const res = await api.post(
                "admin/mini-subcategories",
                {
                  subcategoryId,
                  name: mini.name,
                  slug: mini.slug,
                  description: mini.description,
                  iconUrl: miniIconUrl || "/placeholder.svg",
                  sortOrder: j + 1,
                  isActive: mini.active ?? true,
                },
                token,
              );
              if (!res?.data?.success) {
                throw new Error(
                  res?.data?.error || "Failed to create mini-subcategory",
                );
              }
              // Capture returned ID so future updates/deletes can reference it
              const miniId = res.data?.data?._id;
              if (miniId) {
                mini.id = miniId;
              }
            } catch (e: any) {
              const errorMsg =
                e?.message || "Failed to create mini-subcategory";
              console.error("Failed to create mini-subcategory", mini, e);
              setError(errorMsg);
              continue; // Skip this mini but continue with others
            }
          }
        } catch (e) {
          console.warn("Failed to create subcategory", sub, e);
        }
      }

      window.dispatchEvent(new Event("categories:updated"));
      await fetchCategories();
      resetForm();
      setIsCreateDialogOpen(false);
    } catch (error: any) {
      console.error("Error creating category:", error?.message || error);
      setError(error?.message || "Failed to create category");
    } finally {
      setUploading(false);
    }
  };

  /* ---------------------------------------------------------------- */
  /* UPDATE (generic)                                                 */
  /* ---------------------------------------------------------------- */

  const updateCategory = async (
    categoryId: string,
    updates: Partial<Category>,
  ) => {
    if (!token) return;

    try {
      const payload = toApi(updates);
      const res = await api.put(
        `admin/categories/${categoryId}`,
        payload,
        token,
      );
      if (!res?.data?.success) {
        throw new Error(res?.data?.error || "Failed to update category");
      }
    } catch (error: any) {
      console.error("Error updating category:", error?.message || error);
      throw error;
    }
  };

  /* ---------------------------------------------------------------- */
  /* EDIT FLOW: Sync Subcategories + Mini-Subcategories               */
  /* ---------------------------------------------------------------- */

  const syncSubcategoriesForEdit = async (categoryId: string) => {
    if (!editingCategory) return;

    const existingById = new Map(
      (editingCategory.subcategories || []).map((s) => [s.id, s]),
    );

    for (let i = 0; i < newCategory.subcategories.length; i++) {
      const sub = newCategory.subcategories[i];
      const sortOrder = i + 1;

      let iconUrl: string | undefined = undefined;
      if (sub.imageFile) {
        try {
          iconUrl = await uploadSubIcon(sub.imageFile);
        } catch (err) {
          console.warn("Sub icon upload failed:", err);
        }
      }

      let subcategoryId: string;

      if (sub.id && existingById.has(sub.id)) {
        const payload: any = {
          name: sub.name,
          slug: sub.slug,
          description: sub.description,
          sortOrder,
          isActive: true,
        };
        if (iconUrl) payload.iconUrl = iconUrl;

        try {
          const res = await api.put(
            `admin/subcategories/${sub.id}`,
            payload,
            token,
          );
          if (!res?.data?.success) {
            throw new Error(res?.data?.error || "Failed to update subcategory");
          }
          subcategoryId = sub.id;
        } catch (e) {
          console.error("Update subcategory failed:", sub, e);
          continue;
        }
      } else {
        try {
          const res = await api.post(
            "admin/subcategories",
            {
              categoryId,
              name: sub.name,
              slug: sub.slug,
              description: sub.description,
              iconUrl: iconUrl || "/placeholder.svg",
              sortOrder,
              isActive: true,
            },
            token,
          );
          if (!res?.data?.success) {
            throw new Error(res?.data?.error || "Failed to create subcategory");
          }
          subcategoryId = res.data.data?._id || res.data.data?.subcategoryId;
        } catch (e) {
          console.error("Create subcategory failed:", sub, e);
          continue;
        }
      }

      // Get the original subcategory from editingCategory to compare mini-subcategories
      const originalSubcategory = editingCategory.subcategories.find(
        (s) => s.id === sub.id,
      );
      const existingMiniById = new Map(
        (originalSubcategory?.miniSubcategories || []).map((m) => [m.id, m]),
      );

      for (let j = 0; j < (sub.miniSubcategories?.length ?? 0); j++) {
        const mini = sub.miniSubcategories![j];
        const miniSortOrder = j + 1;

        let miniIconUrl: string | undefined = undefined;
        if (mini.imageFile) {
          try {
            miniIconUrl = await uploadSubIcon(mini.imageFile);
          } catch (err) {
            console.warn("Mini icon upload failed:", err);
          }
        }

        if (mini.id && existingMiniById.has(mini.id)) {
          const payload: any = {
            name: mini.name,
            slug: mini.slug,
            description: mini.description,
            sortOrder: miniSortOrder,
            isActive: mini.active ?? true,
          };
          if (miniIconUrl) payload.iconUrl = miniIconUrl;

          try {
            const res = await api.put(
              `admin/mini-subcategories/${mini.id}`,
              payload,
              token,
            );
            if (!res?.data?.success) {
              throw new Error(
                res?.data?.error || "Failed to update mini-subcategory",
              );
            }
          } catch (e: any) {
            const errorMsg = e?.message || "Failed to update mini-subcategory";
            console.error("Update mini-subcategory failed:", mini, e);
            setError(errorMsg);
          }
        } else if (mini.name && mini.slug) {
          // Only create if mini has name and slug (prevents creating empty entries)
          try {
            const res = await api.post(
              "admin/mini-subcategories",
              {
                subcategoryId,
                name: mini.name,
                slug: mini.slug,
                description: mini.description || "",
                iconUrl: miniIconUrl || "/placeholder.svg",
                sortOrder: miniSortOrder,
                isActive: mini.active ?? true,
              },
              token,
            );
            if (!res?.data?.success) {
              throw new Error(
                res?.data?.error || "Failed to create mini-subcategory",
              );
            }
            // Capture returned ID so future updates/deletes can reference it
            const miniId = res.data?.data?._id;
            if (miniId) {
              mini.id = miniId;
            }
          } catch (e: any) {
            const errorMsg = e?.message || "Failed to create mini-subcategory";
            console.error("Create mini-subcategory failed:", mini, e);
            setError(errorMsg);
            continue; // Skip this mini but continue with others
          }
        }
      }

      // Delete mini-subcategories that are in the original data but not in the form data
      const incomingMiniIds = new Set(
        (sub.miniSubcategories || []).filter((m) => !!m.id).map((m) => m.id!),
      );
      for (const [id] of existingMiniById) {
        if (id && !incomingMiniIds.has(id)) {
          try {
            const res = await api.delete(
              `admin/mini-subcategories/${id}`,
              token,
            );
            if (!res?.data?.success) {
              throw new Error(
                res?.data?.error || "Failed to delete mini-subcategory",
              );
            }
          } catch (e) {
            console.error("Delete mini-subcategory failed:", id, e);
          }
        }
      }
    }

    const incomingIds = new Set(
      newCategory.subcategories.filter((s) => !!s.id).map((s) => s.id!),
    );
    for (const [id] of existingById) {
      if (!incomingIds.has(id)) {
        try {
          const res = await api.delete(`admin/subcategories/${id}`, token);
          if (!res?.data?.success) {
            throw new Error(res?.data?.error || "Failed to delete subcategory");
          }
        } catch (e) {
          console.error("Delete subcategory failed:", id, e);
        }
      }
    }
  };

  /* ---------------------------------------------------------------- */
  /* Single submit for Create + Edit                                  */
  /* ---------------------------------------------------------------- */

  const handleSubmit = async () => {
    if (editingCategory) {
      try {
        setUploading(true);
        let iconUrl = newCategory.icon;

        if (newCategory.iconFile) {
          iconUrl = await uploadIcon(newCategory.iconFile);
        }

        await updateCategory(editingCategory._id, {
          name: newCategory.name,
          slug: newCategory.slug,
          description: newCategory.description,
          icon: iconUrl || "/placeholder.svg",
          order: newCategory.order ?? 999,
          active: newCategory.active ?? true,
        });

        await syncSubcategoriesForEdit(editingCategory._id);

        window.dispatchEvent(new Event("categories:updated"));
        await fetchCategories();
        resetForm();
        setIsCreateDialogOpen(false);
      } catch (e: any) {
        setError(e?.message || "Update failed");
      } finally {
        setUploading(false);
      }
      return;
    }

    await createCategory();
  };

  /* ---------------------------------------------------------------- */
  /* Toggle status                                                    */
  /* ---------------------------------------------------------------- */

  const toggleCategoryStatus = async (categoryId: string, active: boolean) => {
    const prev = [...categories];
    setCategories((cs) =>
      cs.map((c) => (c._id === categoryId ? { ...c, active } : c)),
    );
    try {
      const res = await api.put(
        `admin/categories/${categoryId}`,
        toApi({ active }),
        token,
      );
      if (!res?.data?.success) {
        setCategories(prev);
        throw new Error(res?.data?.error || "Failed to update status");
      }
      window.dispatchEvent(new Event("categories:updated"));
    } catch (e: any) {
      setCategories(prev);
      console.error("Toggle status failed:", e?.message || e);
    }
  };

  /* ---------------------------------------------------------------- */
  /* Order up/down (swap + persist both)                              */
  /* ---------------------------------------------------------------- */

  const updateCategoryOrder = async (
    categoryId: string,
    direction: "up" | "down",
  ) => {
    const currentIndex = categories.findIndex((c) => c._id === categoryId);
    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (currentIndex < 0 || newIndex < 0 || newIndex >= categories.length)
      return;

    const a = categories[currentIndex];
    const b = categories[newIndex];

    const next = [...categories];
    [next[currentIndex].order, next[newIndex].order] = [
      b.order ?? 0,
      a.order ?? 0,
    ];
    setCategories(next);

    try {
      await Promise.all([
        api.put(
          `admin/categories/${a._id}`,
          toApi({ order: next[currentIndex].order }),
          token,
        ),
        api.put(
          `admin/categories/${b._id}`,
          toApi({ order: next[newIndex].order }),
          token,
        ),
      ]);
      window.dispatchEvent(new Event("categories:updated"));
    } catch (err) {
      setCategories(categories);
      console.error("Order update failed", err);
    }
  };

  /* ---------------------------------------------------------------- */
  /* DELETE Category                                                  */
  /* ---------------------------------------------------------------- */

  const deleteCategory = async (categoryId: string) => {
    if (!token || !confirm("Are you sure you want to delete this category?"))
      return;

    try {
      const res = await api.delete(`admin/categories/${categoryId}`, token);
      if (res && res.data && res.data.success) {
        setCategories(categories.filter((cat) => cat._id !== categoryId));
        window.dispatchEvent(new Event("categories:updated"));
      } else {
        setError(res?.data?.error || "Failed to delete category");
      }
    } catch (error: any) {
      console.error("Error deleting category:", error?.message || error);
      setError(error?.message || "Failed to delete category");
    }
  };

  /* ---------------------------------------------------------------- */
  /* Utilities                                                         */
  /* ---------------------------------------------------------------- */

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const resetForm = () => {
    setNewCategory({
      name: "",
      slug: "",
      description: "",
      icon: "",
      iconFile: null,
      subcategories: [],
      order: 999,
      active: true,
    });
    setEditingCategory(null);
    setEditingMiniSubcategoryIndex(null);
    // Keep expanded state for consistency when reopening
    // setExpandedSubcategories(new Set());
  };

  const addSubcategory = () => {
    setNewCategory((prev) => {
      const newSubcategories = [
        ...prev.subcategories,
        { name: "", slug: "", description: "", miniSubcategories: [] },
      ];
      // Auto-expand newly added subcategory so mini-categories section is visible
      const newId = `sub-${newSubcategories.length - 1}`;
      setExpandedSubcategories((prev) => new Set([...prev, newId]));
      return { ...prev, subcategories: newSubcategories };
    });
  };

  const updateSubcategory = (
    index: number,
    field: keyof EditableSubcategory,
    value: string | File,
  ) => {
    setNewCategory((prev) => {
      const updated = [...prev.subcategories];
      const target = { ...updated[index] };

      if (field === "imageFile") {
        target.imageFile = value as File;
      } else {
        (target as any)[field] = value;
        if (field === "name") {
          target.slug = generateSlug(value as string);
        }
      }

      updated[index] = target;
      return { ...prev, subcategories: updated };
    });
  };

  const removeSubcategory = async (index: number) => {
    const sub = newCategory.subcategories[index];

    if (editingCategory && sub?.id && token) {
      try {
        const res = await api.delete(`admin/subcategories/${sub.id}`, token);
        if (!res?.data?.success) {
          throw new Error(res?.data?.error || "Failed to delete subcategory");
        }
        window.dispatchEvent(new Event("subcategories:updated"));
      } catch (error: any) {
        console.error("Error deleting subcategory:", error?.message || error);
        setError(error?.message || "Failed to delete subcategory");
        return;
      }
    }

    setNewCategory((prev) => ({
      ...prev,
      subcategories: prev.subcategories.filter((_, i) => i !== index),
    }));
  };

  const filteredCategories = categories.filter((category) => {
    const safeName = category.name || "";
    const safeDescription = category.description || "";
    const safeSearchTerm = searchTerm || "";
    const matchesSearch =
      safeName.toLowerCase().includes(safeSearchTerm.toLowerCase()) ||
      safeDescription.toLowerCase().includes(safeSearchTerm.toLowerCase());
    const matchesFilter =
      filterStatus === "all" ||
      (filterStatus === "active" && category.active) ||
      (filterStatus === "inactive" && !category.active);
    return matchesSearch && matchesFilter;
  });

  const toggleSubcategoryExpanded = (subcategoryId: string) => {
    const newSet = new Set(expandedSubcategories);
    if (newSet.has(subcategoryId)) {
      newSet.delete(subcategoryId);
    } else {
      newSet.add(subcategoryId);
    }
    setExpandedSubcategories(newSet);
  };

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin w-8 h-8 border-2 border-[#C70000] border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-600">Loading categories...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setError("");
              fetchCategories();
            }}
            className="mt-2"
          >
            Retry
          </Button>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">
            Enhanced Category Management
          </h3>
          <p className="text-gray-600">
            Complete control over categories, subcategories, mini-categories,
            icons, and display order
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setIsCreateDialogOpen(true);
          }}
          className="bg-[#C70000] hover:bg-[#A60000]"
          aria-label="Add Category"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Categories
            </CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
            <p className="text-xs text-muted-foreground">Property categories</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Categories
            </CardTitle>
            <Power className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {categories.filter((c) => c.active).length}
            </div>
            <p className="text-xs text-muted-foreground">Published & visible</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Properties
            </CardTitle>
            <Grid className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {categories.reduce((sum, cat) => sum + (cat.count || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all categories
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Subcategories + Mini
            </CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {categories.reduce((sum, cat) => {
                const subCount = cat.subcategories
                  ? cat.subcategories.length
                  : 0;
                const miniCount =
                  cat.subcategories?.reduce(
                    (m, s) => m + (s.miniSubcategories?.length || 0),
                    0,
                  ) || 0;
                return sum + subCount + miniCount;
              }, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              All sub & mini levels
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex space-x-4">
        <Input
          placeholder="Search categories..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select
          value={filterStatus}
          onValueChange={(value: any) => setFilterStatus(value)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="active">Active Only</SelectItem>
            <SelectItem value="inactive">Inactive Only</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" aria-label="Search categories">
          <Search className="h-4 w-4 mr-2" />
          Search
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Icon</TableHead>
                <TableHead>Subcategories & Mini</TableHead>
                <TableHead>Properties</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCategories.map((category, index) => (
                <TableRow key={category._id}>
                  <TableCell className="font-medium">
                    <div>
                      <p className="font-semibold">{category.name}</p>
                      <p className="text-sm text-gray-500">
                        {category.description}
                      </p>
                      <code className="text-xs bg-gray-100 px-1 rounded">
                        {category.slug}
                      </code>
                    </div>
                  </TableCell>
                  <TableCell>
                    {category.icon ? (
                      <div className="w-8 h-8 bg-red-50 border border-red-100 rounded-lg flex items-center justify-center">
                        {String(category.icon).startsWith("http") ? (
                          <img
                            src={category.icon}
                            alt="Category icon"
                            className="w-6 h-6 object-cover rounded"
                          />
                        ) : (
                          <span className="text-lg">{category.icon}</span>
                        )}
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Image className="h-4 w-4 text-gray-400" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <button
                        className="text-[#C70000] underline text-sm hover:font-semibold block"
                        onClick={() => {
                          setEditingCategory(category);
                          const newSubs = (category.subcategories || []).map(
                            (s) => ({
                              id: s.id,
                              name: s.name,
                              slug: s.slug || "",
                              description: s.description || "",
                              miniSubcategories: (
                                s.miniSubcategories || []
                              ).map((m) => ({
                                id: m.id,
                                name: m.name,
                                slug: m.slug,
                                description: m.description,
                                active: m.active ?? true,
                              })),
                            }),
                          );
                          setNewCategory({
                            name: category.name || "",
                            slug: category.slug || "",
                            description: category.description || "",
                            icon: category.icon || "",
                            iconFile: null,
                            subcategories: newSubs,
                            order: category.order ?? 999,
                            active: !!category.active,
                          });
                          // Auto-expand all subcategories when editing
                          const expandSet = new Set<string>();
                          newSubs.forEach((s, idx) => {
                            // Expand by ID if exists, otherwise by index key (for new ones)
                            expandSet.add(s.id || `sub-${idx}`);
                          });
                          setExpandedSubcategories(expandSet);
                          setIsCreateDialogOpen(true);
                        }}
                      >
                        Manage All ({(category.subcategories || []).length})
                      </button>

                      <div className="pt-1 space-y-1">
                        {(category.subcategories || [])
                          .slice(0, 2)
                          .map((sub) => (
                            <div
                              key={sub.id}
                              className="bg-gray-50 rounded p-2 text-xs border-l-2 border-[#C70000]"
                            >
                              <div className="font-semibold text-gray-700">
                                {sub.name}
                              </div>
                              {sub.miniSubcategories &&
                                sub.miniSubcategories.length > 0 && (
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {sub.miniSubcategories
                                      .slice(0, 3)
                                      .map((mini) => (
                                        <Badge
                                          key={mini.id}
                                          variant="outline"
                                          className="text-xs"
                                        >
                                          {mini.name}
                                        </Badge>
                                      ))}
                                    {sub.miniSubcategories.length > 3 && (
                                      <Badge
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        +{sub.miniSubcategories.length - 3}
                                      </Badge>
                                    )}
                                  </div>
                                )}
                            </div>
                          ))}
                        {(category.subcategories || []).length > 2 && (
                          <div className="text-xs text-gray-500 italic">
                            +{(category.subcategories || []).length - 2} more
                            subcategories
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold">{category.count ?? 0}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={category.active}
                        onCheckedChange={(checked) =>
                          toggleCategoryStatus(category._id, checked)
                        }
                        aria-label={`Toggle status for ${category.name}`}
                      />
                      <Badge
                        variant={category.active ? "default" : "secondary"}
                        className={
                          category.active
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }
                      >
                        {category.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                        {category.order ?? 0}
                      </span>
                      <div className="flex flex-col">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            updateCategoryOrder(category._id, "up")
                          }
                          disabled={index === 0}
                          className="h-6 w-6 p-0"
                          aria-label="Move category up"
                        >
                          <ChevronUp className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            updateCategoryOrder(category._id, "down")
                          }
                          disabled={index === filteredCategories.length - 1}
                          className="h-6 w-6 p-0"
                          aria-label="Move category down"
                        >
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        aria-label="View category"
                        onClick={() => {
                          const slug =
                            category.slug ||
                            category.name.toLowerCase().replace(/\s+/g, "-");
                          window.open(`/categories/${slug}`, "_blank");
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingCategory(category);
                          const newSubs = (category.subcategories || []).map(
                            (s) => ({
                              id: s.id,
                              name: s.name,
                              slug: s.slug || "",
                              description: s.description || "",
                              miniSubcategories: (
                                s.miniSubcategories || []
                              ).map((m) => ({
                                id: m.id,
                                name: m.name,
                                slug: m.slug,
                                description: m.description,
                                active: m.active ?? true,
                              })),
                            }),
                          );
                          setNewCategory({
                            name: category.name || "",
                            slug: category.slug || "",
                            description: category.description || "",
                            icon: category.icon || "",
                            iconFile: null,
                            subcategories: newSubs,
                            order: category.order ?? 999,
                            active: !!category.active,
                          });
                          // Auto-expand all subcategories when editing
                          const expandSet = new Set<string>();
                          newSubs.forEach((s, idx) => {
                            // Expand by ID if exists, otherwise by index key (for new ones)
                            expandSet.add(s.id || `sub-${idx}`);
                          });
                          setExpandedSubcategories(expandSet);
                          setIsCreateDialogOpen(true);
                        }}
                        aria-label="Edit category"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (
                            window.confirm(
                              "Delete this category? This cannot be undone.",
                            )
                          ) {
                            deleteCategory(category._id);
                          }
                        }}
                        className="text-red-600 hover:text-red-700"
                        aria-label="Delete category"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={isCreateDialogOpen}
        onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Edit Category" : "Create New Category"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Category Name *
                </label>
                <Input
                  value={newCategory.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setNewCategory((prev) => ({
                      ...prev,
                      name,
                      slug: generateSlug(name),
                    }));
                  }}
                  placeholder="Enter category name..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Slug *</label>
                <Input
                  value={newCategory.slug}
                  onChange={(e) =>
                    setNewCategory((prev) => ({
                      ...prev,
                      slug: e.target.value,
                    }))
                  }
                  placeholder="category-slug"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Description
              </label>
              <Textarea
                value={newCategory.description}
                onChange={(e) =>
                  setNewCategory((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Enter category description..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Icon URL or Emoji
                </label>
                <Input
                  value={newCategory.icon}
                  onChange={(e) =>
                    setNewCategory((prev) => ({
                      ...prev,
                      icon: e.target.value,
                    }))
                  }
                  placeholder="🏠 or https://example.com/icon.png"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Upload Icon
                </label>
                <div className="flex items-center space-x-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setNewCategory((prev) => ({
                          ...prev,
                          iconFile: file,
                        }));
                      }
                    }}
                    className="flex-1"
                  />
                  <Upload className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Display Order
                </label>
                <Input
                  type="number"
                  value={newCategory.order}
                  onChange={(e) =>
                    setNewCategory((prev) => ({
                      ...prev,
                      order: parseInt(e.target.value) || 999,
                    }))
                  }
                  placeholder="Display order (lower = first)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <div className="flex items-center space-x-2 pt-2">
                  <Switch
                    checked={newCategory.active}
                    onCheckedChange={(checked) =>
                      setNewCategory((prev) => ({
                        ...prev,
                        active: checked,
                      }))
                    }
                  />
                  <span className="text-sm">
                    {newCategory.active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-semibold text-gray-900">Subcategories</h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addSubcategory}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Subcategory
                </Button>
              </div>

              <div className="space-y-4">
                {newCategory.subcategories.map((sub, subIndex) => (
                  <div
                    key={subIndex}
                    className="border border-gray-300 rounded-lg p-4 bg-gradient-to-br from-gray-50 to-white"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <button
                        type="button"
                        onClick={() =>
                          toggleSubcategoryExpanded(sub.id || `sub-${subIndex}`)
                        }
                        className="flex items-center gap-2 hover:text-[#C70000] transition"
                      >
                        {expandedSubcategories.has(
                          sub.id || `sub-${subIndex}`,
                        ) ? (
                          <ChevronDown className="h-5 w-5" />
                        ) : (
                          <ChevronRight className="h-5 w-5" />
                        )}
                        <span className="font-semibold text-gray-900">
                          {sub.name || "New Subcategory"}
                        </span>
                      </button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeSubcategory(subIndex)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-xs font-medium mb-1">
                          Name
                        </label>
                        <Input
                          placeholder="Subcategory name"
                          value={sub.name}
                          onChange={(e) =>
                            updateSubcategory(subIndex, "name", e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">
                          Slug
                        </label>
                        <Input
                          placeholder="subcategory-slug"
                          value={sub.slug}
                          onChange={(e) =>
                            updateSubcategory(subIndex, "slug", e.target.value)
                          }
                        />
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="block text-xs font-medium mb-1">
                        Description
                      </label>
                      <Textarea
                        placeholder="Subcategory description..."
                        value={sub.description}
                        onChange={(e) =>
                          updateSubcategory(
                            subIndex,
                            "description",
                            e.target.value,
                          )
                        }
                        rows={2}
                      />
                    </div>

                    <div className="mb-4">
                      <label className="block text-xs font-medium mb-1">
                        Image
                      </label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            updateSubcategory(subIndex, "imageFile", file);
                          }
                        }}
                      />
                    </div>

                    {expandedSubcategories.has(sub.id || `sub-${subIndex}`) && (
                      <div className="border-t pt-4 bg-white rounded-b-lg">
                        <div className="flex justify-between items-center mb-3">
                          <h5 className="font-semibold text-gray-800 text-sm">
                            Mini-Categories
                          </h5>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addMiniSubcategory(subIndex)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add Mini
                          </Button>
                        </div>

                        <div className="space-y-3">
                          {(sub.miniSubcategories || []).map(
                            (mini, miniIndex) => (
                              <div
                                key={`mini-${mini.id || miniIndex}`}
                                className="border border-gray-200 rounded p-3 bg-gray-50"
                              >
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                  <div>
                                    <label className="block text-xs font-medium mb-1">
                                      Name
                                    </label>
                                    <Input
                                      placeholder="Mini-category name"
                                      value={mini.name}
                                      onChange={(e) =>
                                        updateMiniSubcategory(
                                          subIndex,
                                          miniIndex,
                                          "name",
                                          e.target.value,
                                        )
                                      }
                                      className="text-sm h-8"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium mb-1">
                                      Slug
                                    </label>
                                    <Input
                                      placeholder="mini-slug"
                                      value={mini.slug}
                                      onChange={(e) =>
                                        updateMiniSubcategory(
                                          subIndex,
                                          miniIndex,
                                          "slug",
                                          e.target.value,
                                        )
                                      }
                                      className="text-sm h-8"
                                    />
                                  </div>
                                </div>

                                <div className="mb-2">
                                  <label className="block text-xs font-medium mb-1">
                                    Description
                                  </label>
                                  <Textarea
                                    placeholder="Mini-category description..."
                                    value={mini.description}
                                    onChange={(e) =>
                                      updateMiniSubcategory(
                                        subIndex,
                                        miniIndex,
                                        "description",
                                        e.target.value,
                                      )
                                    }
                                    rows={1}
                                    className="text-sm min-h-8"
                                  />
                                </div>

                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <label className="block text-xs font-medium mb-1">
                                      Image
                                    </label>
                                    <Input
                                      type="file"
                                      accept="image/*"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          updateMiniSubcategory(
                                            subIndex,
                                            miniIndex,
                                            "imageFile",
                                            file,
                                          );
                                        }
                                      }}
                                      className="text-sm h-8"
                                    />
                                  </div>
                                  <div className="flex items-center gap-2 ml-2">
                                    <div className="flex items-center space-x-1">
                                      <Switch
                                        checked={mini.active ?? true}
                                        onCheckedChange={(checked) =>
                                          updateMiniSubcategory(
                                            subIndex,
                                            miniIndex,
                                            "active",
                                            checked,
                                          )
                                        }
                                      />
                                      <span className="text-xs font-medium">
                                        {(mini.active ?? true)
                                          ? "Active"
                                          : "Inactive"}
                                      </span>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        removeMiniSubcategory(
                                          subIndex,
                                          miniIndex,
                                        )
                                      }
                                      className="text-red-600 h-8 w-8 p-0"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ),
                          )}

                          {(!sub.miniSubcategories ||
                            sub.miniSubcategories.length === 0) && (
                            <div className="text-center text-gray-500 text-sm py-2">
                              No mini-categories yet. Click "Add Mini" to create
                              one.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {newCategory.subcategories.length === 0 && (
                  <div className="text-center text-gray-500 py-4 border border-dashed border-gray-300 rounded-lg">
                    No subcategories yet. Click "Add Subcategory" to create one.
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                className="bg-[#C70000] hover:bg-[#A60000]"
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <div className="animate-spin w-4 h-4 border border-white border-t-transparent rounded-full mr-2"></div>
                    {editingCategory ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {editingCategory ? "Update Category" : "Create Category"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
