import { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { api, createApiUrl } from "../../lib/api";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  Search,
  FileText,
  Calendar,
  User,
  Tag,
  Image as ImageIcon,
  Save,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

interface Blog {
  _id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  featuredImage?: string;
  authorName: string;
  publishStatus: "draft" | "published";
  publishedAt?: string;
  tags?: string[];
  views: number;
  createdAt: string;
  updatedAt: string;
}

export default function BlogManagement() {
  const { user, token } = useAuth();
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBlog, setEditingBlog] = useState<Blog | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    content: "",
    excerpt: "",
    metaDescription: "",
    metaKeywords: "",
    tags: "",
    publishStatus: "published" as "draft" | "published",
  });
  const [featuredImage, setFeaturedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    try {
      setLoading(true);
      const response = await api.get("/admin/blogs", token);
      if (response.data.success) {
        setBlogs(response.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching blogs:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (field === "title" && !editingBlog) {
      setFormData((prev) => ({
        ...prev,
        slug: generateSlug(value),
      }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFeaturedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.content) {
      alert("Title and content are required");
      return;
    }

    try {
      setSubmitting(true);
      const form = new FormData();
      form.append("title", formData.title);
      form.append("slug", formData.slug || generateSlug(formData.title));
      form.append("content", formData.content);
      form.append("excerpt", formData.excerpt);
      form.append("metaDescription", formData.metaDescription);
      form.append(
        "metaKeywords",
        JSON.stringify(
          formData.metaKeywords.split(",").map((k) => k.trim()).filter(Boolean),
        ),
      );
      form.append(
        "tags",
        JSON.stringify(
          formData.tags.split(",").map((t) => t.trim()).filter(Boolean),
        ),
      );
      form.append("publishStatus", formData.publishStatus);

      if (featuredImage) {
        form.append("featuredImage", featuredImage);
      }

      const url = editingBlog
        ? `/admin/blogs/${editingBlog._id}`
        : "/admin/blogs";
      const method = editingBlog ? "put" : "post";

      const response = await fetch(createApiUrl(url), {
        method: method.toUpperCase(),
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: form,
      });

      const data = await response.json();

      if (data.success) {
        alert(
          editingBlog
            ? "Blog updated successfully!"
            : "Blog created successfully!",
        );
        setIsDialogOpen(false);
        resetForm();
        fetchBlogs();
      } else {
        alert(data.error || "Failed to save blog");
      }
    } catch (error) {
      console.error("Error saving blog:", error);
      alert("Failed to save blog");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (blog: Blog) => {
    setEditingBlog(blog);
    setFormData({
      title: blog.title,
      slug: blog.slug,
      content: blog.content,
      excerpt: blog.excerpt || "",
      metaDescription: blog.metaDescription || "",
      metaKeywords: blog.metaKeywords?.join(", ") || "",
      tags: blog.tags?.join(", ") || "",
      publishStatus: blog.publishStatus,
    });
    if (blog.featuredImage) {
      setImagePreview(blog.featuredImage);
    }
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this blog?")) return;

    try {
      const response = await api.delete(`/admin/blogs/${id}`, token);
      if (response.data.success) {
        alert("Blog deleted successfully!");
        fetchBlogs();
      } else {
        alert(response.data.error || "Failed to delete blog");
      }
    } catch (error) {
      console.error("Error deleting blog:", error);
      alert("Failed to delete blog");
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      slug: "",
      content: "",
      excerpt: "",
      metaDescription: "",
      metaKeywords: "",
      tags: "",
      publishStatus: "published",
    });
    setFeaturedImage(null);
    setImagePreview("");
    setEditingBlog(null);
  };

  const filteredBlogs = blogs.filter(
    (blog) =>
      blog.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      blog.content.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Blog Management</h2>
          <p className="text-gray-600 mt-1">
            Create and manage SEO-optimized blogs
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Create New Blog
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingBlog ? "Edit Blog" : "Create New Blog"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange("title", e.target.value)}
                    placeholder="Enter blog title"
                    required
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="slug">
                    URL Slug * (SEO-friendly URL)
                  </Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => handleInputChange("slug", e.target.value)}
                    placeholder="auto-generated-from-title"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    URL will be: /blog/{formData.slug || "your-slug"}
                  </p>
                </div>

                <div className="col-span-2">
                  <Label htmlFor="content">Content *</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) =>
                      handleInputChange("content", e.target.value)
                    }
                    placeholder="Write your blog content here..."
                    rows={10}
                    required
                    className="font-mono text-sm"
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="excerpt">Excerpt (Short Summary)</Label>
                  <Textarea
                    id="excerpt"
                    value={formData.excerpt}
                    onChange={(e) =>
                      handleInputChange("excerpt", e.target.value)
                    }
                    placeholder="Brief summary of the blog..."
                    rows={3}
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="metaDescription">
                    Meta Description (SEO)
                  </Label>
                  <Textarea
                    id="metaDescription"
                    value={formData.metaDescription}
                    onChange={(e) =>
                      handleInputChange("metaDescription", e.target.value)
                    }
                    placeholder="SEO meta description (160 characters recommended)"
                    rows={2}
                    maxLength={160}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.metaDescription.length}/160 characters
                  </p>
                </div>

                <div>
                  <Label htmlFor="metaKeywords">
                    Meta Keywords (SEO - comma separated)
                  </Label>
                  <Input
                    id="metaKeywords"
                    value={formData.metaKeywords}
                    onChange={(e) =>
                      handleInputChange("metaKeywords", e.target.value)
                    }
                    placeholder="property, real estate, blog"
                  />
                </div>

                <div>
                  <Label htmlFor="tags">Tags (comma separated)</Label>
                  <Input
                    id="tags"
                    value={formData.tags}
                    onChange={(e) => handleInputChange("tags", e.target.value)}
                    placeholder="tips, guide, news"
                  />
                </div>

                <div>
                  <Label htmlFor="featuredImage">Featured Image</Label>
                  <Input
                    id="featuredImage"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                </div>

                <div>
                  <Label htmlFor="publishStatus">Publish Status</Label>
                  <Select
                    value={formData.publishStatus}
                    onValueChange={(value) =>
                      handleInputChange("publishStatus", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {imagePreview && (
                  <div className="col-span-2">
                    <Label>Image Preview</Label>
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  <Save className="w-4 h-4 mr-2" />
                  {submitting ? "Saving..." : editingBlog ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Search blogs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading blogs...</p>
            </div>
          ) : filteredBlogs.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No blogs found
              </h3>
              <p className="text-gray-600">
                {searchTerm
                  ? "No blogs match your search"
                  : "Create your first blog to get started"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredBlogs.map((blog) => (
                <Card key={blog._id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex gap-4">
                      {blog.featuredImage && (
                        <img
                          src={blog.featuredImage}
                          alt={blog.title}
                          className="w-32 h-32 object-cover rounded-lg"
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-1">
                              {blog.title}
                            </h3>
                            <p className="text-sm text-gray-600">
                              /blog/{blog.slug}
                            </p>
                          </div>
                          <Badge
                            variant={
                              blog.publishStatus === "published"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {blog.publishStatus}
                          </Badge>
                        </div>

                        <p className="text-gray-700 mb-4 line-clamp-2">
                          {blog.excerpt || blog.content.substring(0, 200)}...
                        </p>

                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {blog.authorName}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(blog.createdAt).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <Eye className="w-4 h-4" />
                            {blog.views} views
                          </div>
                        </div>

                        {blog.tags && blog.tags.length > 0 && (
                          <div className="flex items-center gap-2 mb-4">
                            <Tag className="w-4 h-4 text-gray-400" />
                            <div className="flex gap-2">
                              {blog.tags.map((tag, idx) => (
                                <Badge key={idx} variant="outline">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(blog)}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              window.open(`/blog/${blog.slug}`, "_blank")
                            }
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(blog._id)}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
