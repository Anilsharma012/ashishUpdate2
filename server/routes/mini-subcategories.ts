import { RequestHandler } from "express";
import { ObjectId } from "mongodb";
import { getDatabase } from "../db/mongodb";
import { MiniSubcategory, ApiResponse } from "@shared/types";

// Generate unique slug with optional auto-suffix (e.g., "shop-2", "shop-3")
async function ensureUniqueSlugInSubcategory(
  db: any,
  baseSlug: string,
  subcategoryId: string,
  excludeId?: string,
): Promise<string> {
  let slug = baseSlug;
  let counter = 2;

  while (true) {
    const filter: any = { slug, subcategoryId };
    if (excludeId) {
      filter._id = { $ne: new ObjectId(excludeId) };
    }

    const existing = await db.collection("mini_subcategories").findOne(filter);
    if (!existing) break;

    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

// Helper: normalize slug
const normSlug = (s: string): string =>
  s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "");

// Get all mini-subcategories (with pagination and filters)
export const getAllMiniSubcategories: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const {
      search = "",
      page = "1",
      limit = "10",
      subcategoryId,
      active,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.max(1, parseInt(limit as string) || 10);
    const skip = (pageNum - 1) * limitNum;

    const filter: any = {};

    if (subcategoryId) {
      filter.subcategoryId = subcategoryId;
    }

    if (active !== undefined) {
      const activeVal = active === "true";
      filter.$or = [{ active: activeVal }, { isActive: activeVal }];
    }

    if (search && typeof search === "string") {
      const searchRegex = new RegExp(search, "i");
      filter.$or = [
        ...(filter.$or || []),
        { name: searchRegex },
        { slug: searchRegex },
        { description: searchRegex },
      ];
    }

    const [minis, total] = await Promise.all([
      db
        .collection("mini_subcategories")
        .find(filter)
        .sort({ sortOrder: 1, createdAt: 1 })
        .skip(skip)
        .limit(limitNum)
        .toArray(),
      db.collection("mini_subcategories").countDocuments(filter),
    ]);

    const response: ApiResponse<{
      miniSubcategories: MiniSubcategory[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }> = {
      success: true,
      data: {
        miniSubcategories: minis as unknown as MiniSubcategory[],
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching mini-subcategories:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch mini-subcategories",
    });
  }
};

// Get mini-subcategories by subcategory ID
export const getMiniSubcategoriesBySubcategoryId: RequestHandler = async (
  req,
  res,
) => {
  try {
    const db = getDatabase();
    const { subcategoryId } = req.params;

    if (!subcategoryId || !ObjectId.isValid(subcategoryId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid subcategoryId",
      });
    }

    const minis = await db
      .collection("mini_subcategories")
      .find({
        subcategoryId,
        $or: [{ active: true }, { isActive: true }],
      })
      .sort({ sortOrder: 1, createdAt: 1 })
      .toArray();

    const response: ApiResponse<MiniSubcategory[]> = {
      success: true,
      data: minis as unknown as MiniSubcategory[],
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching mini-subcategories:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch mini-subcategories",
    });
  }
};

// Create mini-subcategory
export const createMiniSubcategory: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const raw = req.body || {};
    const subcategoryId = raw.subcategoryId;
    const name = raw.name ? String(raw.name).trim() : "";
    const slugRaw = raw.slug ? String(raw.slug).trim() : "";

    // Validate required fields
    if (!subcategoryId || !name) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: subcategoryId, name",
      });
    }

    // Verify subcategory exists
    if (!ObjectId.isValid(subcategoryId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid subcategoryId",
      });
    }

    const subcategory = await db
      .collection("subcategories")
      .findOne({ _id: new ObjectId(subcategoryId) });

    if (!subcategory) {
      return res.status(404).json({
        success: false,
        error: "Subcategory not found",
      });
    }

    // Generate slug
    const baseSlug = slugRaw || normSlug(name);
    const slug = await ensureUniqueSlugInSubcategory(
      db,
      baseSlug,
      subcategoryId,
    );

    // Create mini-subcategory
    const miniData: Omit<MiniSubcategory, "_id"> = {
      subcategoryId,
      name,
      slug,
      description: raw.description || "",
      icon: raw.icon || "",
      iconUrl: raw.iconUrl || "",
      sortOrder: raw.sortOrder || 0,
      active: raw.active !== false,
      isActive: raw.isActive !== false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db
      .collection("mini_subcategories")
      .insertOne(miniData);

    const response: ApiResponse<{ _id: string }> = {
      success: true,
      data: { _id: result.insertedId.toString() },
    };

    res.json(response);
  } catch (error) {
    console.error("Error creating mini-subcategory:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create mini-subcategory",
    });
  }
};

// Update mini-subcategory
export const updateMiniSubcategory: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const { miniSubcategoryId } = req.params;

    if (!miniSubcategoryId || !ObjectId.isValid(miniSubcategoryId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid miniSubcategoryId",
      });
    }

    const raw = req.body || {};
    const updateData: any = {};

    if (raw.name !== undefined) {
      const name = String(raw.name).trim();
      if (!name) {
        return res.status(400).json({
          success: false,
          error: "Name cannot be empty",
        });
      }
      updateData.name = name;
    }

    if (raw.slug !== undefined) {
      const newSlug = String(raw.slug).trim();
      if (!newSlug) {
        return res.status(400).json({
          success: false,
          error: "Slug cannot be empty",
        });
      }
      updateData.slug = newSlug;
    }

    if (raw.description !== undefined) updateData.description = raw.description;
    if (raw.icon !== undefined) updateData.icon = raw.icon;
    if (raw.iconUrl !== undefined) updateData.iconUrl = raw.iconUrl;
    if (raw.sortOrder !== undefined) updateData.sortOrder = raw.sortOrder;
    if (raw.active !== undefined) updateData.active = raw.active;
    if (raw.isActive !== undefined) updateData.isActive = raw.isActive;

    // Check slug uniqueness if updating slug
    if (updateData.slug) {
      const mini = await db
        .collection("mini_subcategories")
        .findOne({ _id: new ObjectId(miniSubcategoryId) });

      if (mini) {
        const subcategoryId = mini.subcategoryId;
        const existing = await db.collection("mini_subcategories").findOne({
          subcategoryId,
          slug: updateData.slug,
          _id: { $ne: new ObjectId(miniSubcategoryId) },
        });

        if (existing) {
          return res.status(400).json({
            success: false,
            error:
              "Mini-subcategory with this slug already exists in this subcategory",
          });
        }
      }
    }

    updateData.updatedAt = new Date();

    const result = await db
      .collection("mini_subcategories")
      .updateOne(
        { _id: new ObjectId(miniSubcategoryId) },
        { $set: updateData },
      );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Mini-subcategory not found",
      });
    }

    const response: ApiResponse<{ updated: boolean }> = {
      success: true,
      data: { updated: true },
    };

    res.json(response);
  } catch (error) {
    console.error("Error updating mini-subcategory:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update mini-subcategory",
    });
  }
};

// Delete mini-subcategory
export const deleteMiniSubcategory: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const { miniSubcategoryId } = req.params;

    if (!miniSubcategoryId || !ObjectId.isValid(miniSubcategoryId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid miniSubcategoryId",
      });
    }

    // Check if mini-subcategory has linked properties
    const propertyCount = await db.collection("properties").countDocuments({
      miniSubcategoryId,
    });

    if (propertyCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete mini-subcategory with ${propertyCount} linked properties`,
      });
    }

    const result = await db
      .collection("mini_subcategories")
      .deleteOne({ _id: new ObjectId(miniSubcategoryId) });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Mini-subcategory not found",
      });
    }

    const response: ApiResponse<{ deleted: boolean }> = {
      success: true,
      data: { deleted: true },
    };

    res.json(response);
  } catch (error) {
    console.error("Error deleting mini-subcategory:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete mini-subcategory",
    });
  }
};

// Toggle mini-subcategory active status
export const toggleMiniSubcategoryActive: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const { miniSubcategoryId } = req.params;

    if (!miniSubcategoryId || !ObjectId.isValid(miniSubcategoryId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid miniSubcategoryId",
      });
    }

    const mini = await db
      .collection("mini_subcategories")
      .findOne({ _id: new ObjectId(miniSubcategoryId) });

    if (!mini) {
      return res.status(404).json({
        success: false,
        error: "Mini-subcategory not found",
      });
    }

    const newActive = !(mini.active !== false && mini.isActive !== false);

    await db
      .collection("mini_subcategories")
      .updateOne(
        { _id: new ObjectId(miniSubcategoryId) },
        {
          $set: {
            active: newActive,
            isActive: newActive,
            updatedAt: new Date(),
          },
        },
      );

    const response: ApiResponse<{ active: boolean }> = {
      success: true,
      data: { active: newActive },
    };

    res.json(response);
  } catch (error) {
    console.error("Error toggling mini-subcategory status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to toggle mini-subcategory status",
    });
  }
};

// Get mini-subcategories with property counts
export const getMiniSubcategoriesWithCounts: RequestHandler = async (
  req,
  res,
) => {
  try {
    const db = getDatabase();
    const { subcategoryId } = req.params;

    if (!subcategoryId || !ObjectId.isValid(subcategoryId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid subcategoryId",
      });
    }

    // Get all active mini-subcategories for this subcategory
    const minis = await db
      .collection("mini_subcategories")
      .find({
        subcategoryId,
        $or: [{ active: true }, { isActive: true }],
      })
      .sort({ sortOrder: 1, createdAt: 1 })
      .toArray();

    // Get property counts for each mini-subcategory
    const miniIds = minis.map((m: any) => m._id.toString());

    const counts = await db
      .collection("properties")
      .aggregate([
        {
          $match: {
            miniSubcategoryId: { $in: miniIds },
            status: "active",
            $or: [
              { approvalStatus: "approved" },
              { approvalStatus: { $exists: false } },
              { approvalStatus: "pending" },
            ],
          },
        },
        {
          $group: {
            _id: "$miniSubcategoryId",
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();

    // Create count map
    const countMap = new Map(counts.map((c: any) => [c._id, c.count]));

    // Merge counts with mini-subcategories
    const result = minis.map((mini: any) => ({
      ...mini,
      count: countMap.get(mini._id.toString()) || 0,
    }));

    const response: ApiResponse<any[]> = {
      success: true,
      data: result,
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching mini-subcategories with counts:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch mini-subcategories with counts",
    });
  }
};
