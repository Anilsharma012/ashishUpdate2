import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { api } from "../lib/api";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Calendar, User, Eye, Tag, ArrowLeft, Clock } from "lucide-react";

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
  publishedAt?: string;
  tags?: string[];
  views: number;
  createdAt: string;
  updatedAt: string;
}

export default function BlogDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (slug) {
      fetchBlog();
    }
  }, [slug]);

  const fetchBlog = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get(`/blogs/${slug}`);
      if (response.data.success) {
        setBlog(response.data.data);
      } else {
        setError("Blog not found");
      }
    } catch (error: any) {
      console.error("Error fetching blog:", error);
      setError("Failed to load blog");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading blog...</p>
        </div>
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {error || "Blog not found"}
          </h2>
          <Button onClick={() => navigate("/blogs")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Blogs
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{blog.title} | Ashish Properties Blog</title>
        <meta
          name="description"
          content={
            blog.metaDescription || blog.excerpt || blog.content.substring(0, 160)
          }
        />
        {blog.metaKeywords && blog.metaKeywords.length > 0 && (
          <meta name="keywords" content={blog.metaKeywords.join(", ")} />
        )}
        <meta property="og:title" content={blog.title} />
        <meta
          property="og:description"
          content={
            blog.metaDescription || blog.excerpt || blog.content.substring(0, 160)
          }
        />
        {blog.featuredImage && (
          <meta property="og:image" content={blog.featuredImage} />
        )}
        <meta property="og:type" content="article" />
        <meta
          property="article:published_time"
          content={blog.publishedAt || blog.createdAt}
        />
        <meta property="article:author" content={blog.authorName} />
        {blog.tags?.map((tag) => (
          <meta key={tag} property="article:tag" content={tag} />
        ))}
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Link to="/blogs">
            <Button variant="outline" className="mb-6">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Blogs
            </Button>
          </Link>

          <article className="bg-white rounded-lg shadow-lg overflow-hidden">
            {blog.featuredImage && (
              <img
                src={blog.featuredImage}
                alt={blog.title}
                className="w-full h-96 object-cover"
              />
            )}

            <div className="p-8 md:p-12">
              <div className="mb-6">
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                  {blog.title}
                </h1>

                <div className="flex flex-wrap items-center gap-4 text-gray-600 mb-6">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    <span className="font-medium">{blog.authorName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    <span>
                      {new Date(
                        blog.publishedAt || blog.createdAt,
                      ).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    <span>{Math.ceil(blog.content.split(" ").length / 200)} min read</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    <span>{blog.views} views</span>
                  </div>
                </div>

                {blog.tags && blog.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {blog.tags.map((tag, idx) => (
                      <Badge key={idx} variant="secondary" className="text-sm">
                        <Tag className="w-3 h-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {blog.excerpt && (
                <div className="mb-8 p-6 bg-orange-50 border-l-4 border-orange-500 rounded-r-lg">
                  <p className="text-lg text-gray-700 italic">{blog.excerpt}</p>
                </div>
              )}

              <div
                className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-orange-600 prose-strong:text-gray-900"
                style={{ whiteSpace: "pre-wrap" }}
              >
                {blog.content}
              </div>

              <div className="mt-12 pt-8 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Last updated:</p>
                    <p className="text-gray-700">
                      {new Date(blog.updatedAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <Link to="/blogs">
                    <Button>View More Blogs</Button>
                  </Link>
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>
    </>
  );
}
