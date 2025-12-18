import { RequestHandler } from "express";
import { getDatabase } from "../db/mongodb";
import { Blog, ApiResponse } from "@shared/types";
import { ObjectId } from "mongodb";
import multer from "multer";
import path from "path";
import fs from "fs";

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadPath = path.join(process.cwd(), "uploads", "blogs");
    if (!fs.existsSync(uploadPath))
      fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(
      null,
      `blog-${uniqueSuffix}${path.extname(file.originalname)}`,
    );
  },
});

export const uploadBlogImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req: any, file, cb) => {
    if (file.mimetype?.startsWith?.("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export const createBlog: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const userId = (req as any).userId;
    const userType = (req as any).userType;

    if (!userId || userType !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Only admins can create blogs",
      } as ApiResponse);
    }

    const {
      title,
      content,
      excerpt,
      metaDescription,
      metaKeywords,
      tags,
      publishStatus,
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        error: "Title and content are required",
      } as ApiResponse);
    }

    let slug = req.body.slug || generateSlug(title);
    
    const existingBlog = await db.collection("blogs").findOne({ slug });
    if (existingBlog) {
      slug = `${slug}-${Date.now()}`;
    }

    const featuredImage = req.file
      ? `/uploads/blogs/${req.file.filename}`
      : undefined;

    let parsedKeywords: string[] = [];
    let parsedTags: string[] = [];

    try {
      parsedKeywords = metaKeywords
        ? Array.isArray(metaKeywords)
          ? metaKeywords
          : JSON.parse(metaKeywords)
        : [];
    } catch (error) {
      console.warn("Invalid metaKeywords JSON, using empty array");
    }

    try {
      parsedTags = tags
        ? Array.isArray(tags)
          ? tags
          : JSON.parse(tags)
        : [];
    } catch (error) {
      console.warn("Invalid tags JSON, using empty array");
    }

    const author = await db.collection("users").findOne({ 
      _id: new ObjectId(userId) 
    });

    const finalPublishStatus = publishStatus || "published";
    const blog: Blog = {
      title,
      slug,
      content,
      excerpt: excerpt || content.substring(0, 200),
      metaDescription: metaDescription || content.substring(0, 160),
      metaKeywords: parsedKeywords,
      featuredImage,
      authorId: userId,
      authorName: author?.name || "Admin",
      publishStatus: finalPublishStatus,
      publishedAt:
        finalPublishStatus === "published" ? new Date() : undefined,
      tags: parsedTags,
      views: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("blogs").insertOne(blog);

    res.json({
      success: true,
      data: { ...blog, _id: result.insertedId.toString() },
    } as ApiResponse);
  } catch (error: any) {
    console.error("Error creating blog:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to create blog",
    } as ApiResponse);
  }
};

export const getAllBlogs: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const userType = (req as any).userType;
    const isAdmin = userType === "admin";

    const filter: any = isAdmin
      ? {}
      : { publishStatus: "published" };

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const blogs = await db
      .collection("blogs")
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await db.collection("blogs").countDocuments(filter);

    res.json({
      success: true,
      data: blogs.map((b) => ({ ...b, _id: b._id.toString() })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    } as ApiResponse);
  } catch (error: any) {
    console.error("Error fetching blogs:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch blogs",
    } as ApiResponse);
  }
};

export const getBlogBySlug: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const { slug } = req.params;
    const userType = (req as any).userType;
    const isAdmin = userType === "admin";

    const filter: any = { slug };
    if (!isAdmin) {
      filter.publishStatus = "published";
    }

    const blog = await db.collection("blogs").findOne(filter);

    if (!blog) {
      return res.status(404).json({
        success: false,
        error: "Blog not found",
      } as ApiResponse);
    }

    await db
      .collection("blogs")
      .updateOne({ _id: blog._id }, { $inc: { views: 1 } });

    res.json({
      success: true,
      data: { ...blog, _id: blog._id.toString(), views: blog.views + 1 },
    } as ApiResponse);
  } catch (error: any) {
    console.error("Error fetching blog:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch blog",
    } as ApiResponse);
  }
};

export const updateBlog: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const userId = (req as any).userId;
    const userType = (req as any).userType;
    const { id } = req.params;

    if (!userId || userType !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Only admins can update blogs",
      } as ApiResponse);
    }

    const {
      title,
      content,
      excerpt,
      metaDescription,
      metaKeywords,
      tags,
      publishStatus,
      slug,
    } = req.body;

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (title) updateData.title = title;
    if (content) updateData.content = content;
    if (excerpt) updateData.excerpt = excerpt;
    if (metaDescription) updateData.metaDescription = metaDescription;
    
    if (metaKeywords) {
      try {
        updateData.metaKeywords = Array.isArray(metaKeywords)
          ? metaKeywords
          : JSON.parse(metaKeywords);
      } catch (error) {
        console.warn("Invalid metaKeywords JSON in update, skipping");
      }
    }
    
    if (tags) {
      try {
        updateData.tags = Array.isArray(tags) ? tags : JSON.parse(tags);
      } catch (error) {
        console.warn("Invalid tags JSON in update, skipping");
      }
    }
    
    if (slug) updateData.slug = slug;

    if (req.file) {
      updateData.featuredImage = `/uploads/blogs/${req.file.filename}`;
    }

    if (publishStatus) {
      updateData.publishStatus = publishStatus;
      if (publishStatus === "published" && !updateData.publishedAt) {
        updateData.publishedAt = new Date();
      }
    }

    const result = await db
      .collection("blogs")
      .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Blog not found",
      } as ApiResponse);
    }

    const updatedBlog = await db
      .collection("blogs")
      .findOne({ _id: new ObjectId(id) });

    res.json({
      success: true,
      data: { ...updatedBlog, _id: updatedBlog!._id.toString() },
    } as ApiResponse);
  } catch (error: any) {
    console.error("Error updating blog:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to update blog",
    } as ApiResponse);
  }
};

export const deleteBlog: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const userId = (req as any).userId;
    const userType = (req as any).userType;
    const { id } = req.params;

    if (!userId || userType !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Only admins can delete blogs",
      } as ApiResponse);
    }

    const result = await db
      .collection("blogs")
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Blog not found",
      } as ApiResponse);
    }

    res.json({
      success: true,
      message: "Blog deleted successfully",
    } as ApiResponse);
  } catch (error: any) {
    console.error("Error deleting blog:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to delete blog",
    } as ApiResponse);
  }
};
