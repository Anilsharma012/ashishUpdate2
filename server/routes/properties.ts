// server/routes/properties.ts
import { RequestHandler } from "express";
import { getDatabase } from "../db/mongodb";
import { Property, ApiResponse } from "@shared/types";
import { ObjectId } from "mongodb";
import multer, { FileFilterCallback } from "multer";
import path from "path";
import fs from "fs";
import {
  sendPropertyConfirmationEmail,
  sendPropertyApprovalEmail,
} from "../utils/mailer";

/* =========================================================================
   Multer (image uploads)
   ========================================================================= */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadPath = path.join(process.cwd(), "uploads", "properties");
    if (!fs.existsSync(uploadPath))
      fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(
      null,
      `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`,
    );
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req: any, file, cb: FileFilterCallback) => {
    if (file.mimetype?.startsWith?.("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

/* =========================================================================
   Helpers
   ========================================================================= */
const toInt = (v: any): number | undefined => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
};

function normSlug(v: any): string {
  return String(v || "")
    .trim()
    .toLowerCase();
}

const escapeRegex = (s: string) =>
  s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const pickFirst = (obj: any, keys: string[]) => {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return undefined;
};

// Map UI aliases → canonical DB values
const TYPE_ALIASES: Record<string, string> = {
  // PG / Co-living
  "co-living": "pg",
  coliving: "pg",
  pg: "pg",

  // Agricultural
  "agricultural-land": "agricultural",
  agri: "agricultural",
  agricultural: "agricultural",

  // Commercial family
  commercial: "commercial",
  showroom: "commercial",
  office: "commercial",
  shop: "commercial",
  warehouse: "commercial",

  // Residential family
  residential: "residential",
  flat: "flat",
  apartment: "flat",

  // Plot
  plot: "plot",
};

const PROPERTY_TYPE_CATEGORY_SLUGS = new Set([
  "pg",
  "commercial",
  "agricultural",
  "residential",
  "flat",
  "plot",
]);

const TOP_TABS = new Set(["buy", "rent", "sale", "lease", "pg"]);

const PRICE_TYPE_ALIASES: Record<string, string> = {
  buy: "sale",
  sale: "sale",
  rent: "rent",
  lease: "rent",
  pg: "rent",
  "co-living": "rent",
  coliving: "rent",
};

function normPriceType(v: any): string {
  const s = normSlug(v);
  return PRICE_TYPE_ALIASES[s] || s;
}

async function resolveMiniSubcategoryId(opts: {
  db: ReturnType<typeof getDatabase>;
  miniSlug?: string;
  subSlug?: string;
  categorySlug?: string;
  propertyType?: string;
  priceType?: string;
}): Promise<string | undefined> {
  const { db } = opts;
  const miniSlug = normSlug(opts.miniSlug);
  const subSlug = normSlug(opts.subSlug);
  const categorySlug = normSlug(opts.categorySlug);
  const priceType = normSlug(opts.priceType);

  let propertyType = normSlug(opts.propertyType);
  if (propertyType && TYPE_ALIASES[propertyType]) propertyType = TYPE_ALIASES[propertyType];

  if (!miniSlug || !subSlug) return undefined;

  const candidates: string[] = [];

  // ✅ 1) If propertyType looks like a real category group, prefer it
  if (propertyType && PROPERTY_TYPE_CATEGORY_SLUGS.has(propertyType)) {
    candidates.push(propertyType);
  }

  // ✅ 2) If category is a real category (commercial/agricultural/pg etc), use it
  if (categorySlug && !TOP_TABS.has(categorySlug)) {
    candidates.push(categorySlug);
  }

  // ✅ 3) If category is buy/rent tab, still keep it as fallback
  if (categorySlug && TOP_TABS.has(categorySlug)) {
    candidates.push(categorySlug);
  }

  // ✅ 4) Final fallback based on priceType
  candidates.push(priceType === "rent" ? "rent" : "buy");

  const uniqueCandidates = [...new Set(candidates)].filter(Boolean);

  for (const parentCategorySlug of uniqueCandidates) {
    // Find parent category (if exists)
    const parentCategory = await db.collection("categories").findOne({
      slug: parentCategorySlug,
    });

    // Find subcategory under that parent (preferred)
    let subcategoryDoc = await db.collection("subcategories").findOne({
      slug: subSlug,
      ...(parentCategory ? { categoryId: parentCategory._id?.toString() } : {}),
    });

    // If not found with categoryId, try global slug match (backup)
    if (!subcategoryDoc) {
      subcategoryDoc = await db.collection("subcategories").findOne({
        slug: subSlug,
      });
    }

    if (!subcategoryDoc) continue;

    const miniDoc = await db.collection("mini_subcategories").findOne({
      slug: miniSlug,
      subcategoryId: subcategoryDoc._id?.toString(),
    });

    if (miniDoc?._id) return miniDoc._id.toString();
  }

  return undefined;
}

// ✅ NEW: if UI mistakenly sends `subCategory=shop` (mini slug),
// try resolving mini-subcategory globally (or within parent groups).
async function resolveMiniBySlugLoose(opts: {
  db: ReturnType<typeof getDatabase>;
  miniSlug: string;
  categorySlug?: string;
  propertyType?: string;
}): Promise<string | undefined> {
  const { db } = opts;
  const miniSlug = normSlug(opts.miniSlug);
  if (!miniSlug) return undefined;

  const categorySlug = normSlug(opts.categorySlug);
  let propertyType = normSlug(opts.propertyType);
  if (propertyType && TYPE_ALIASES[propertyType]) propertyType = TYPE_ALIASES[propertyType];

  const candidates: string[] = [];
  if (propertyType && PROPERTY_TYPE_CATEGORY_SLUGS.has(propertyType)) candidates.push(propertyType);
  if (categorySlug && !TOP_TABS.has(categorySlug)) candidates.push(categorySlug);

  const uniqueCandidates = [...new Set(candidates)].filter(Boolean);

  // 1) Try within candidate parent categories
  for (const parentSlug of uniqueCandidates) {
    const parentCategory = await db.collection("categories").findOne({ slug: parentSlug });
    if (!parentCategory?._id) continue;

    const subs = await db
      .collection("subcategories")
      .find({ categoryId: parentCategory._id.toString() })
      .project({ _id: 1 })
      .toArray();

    const subIds = subs.map((s) => s._id?.toString()).filter(Boolean) as string[];
    if (!subIds.length) continue;

    const mini = await db.collection("mini_subcategories").findOne({
      slug: miniSlug,
      subcategoryId: { $in: subIds },
    });

    if (mini?._id) return mini._id.toString();
  }

  // 2) Global fallback (only if unique)
  const minis = await db
    .collection("mini_subcategories")
    .find({ slug: miniSlug })
    .project({ _id: 1 })
    .limit(2)
    .toArray();

  if (minis.length === 1 && minis[0]?._id) return minis[0]._id.toString();
  return undefined;
}

/* =========================================================================
   PUBLIC: Generic listing (supports many query aliases)
   ========================================================================= */
export const getProperties: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();

    // ✅ Support aliases from UI
    const qCategory = pickFirst(req.query, ["category", "categorySlug"]);
    const qPropertyType = pickFirst(req.query, ["propertyType", "type"]);
    const qSubCategory = pickFirst(req.query, [
      "subCategory",
      "subcategory",
      "sub",
      "subCat",
    ]);
    const qMiniSlug = pickFirst(req.query, [
      "miniSubcategory",
      "miniSubcategorySlug",
      "mini",
    ]);
    const qMiniId = pickFirst(req.query, ["miniSubcategoryId"]);
    const priceType = pickFirst(req.query, ["priceType"]);

    const sector = pickFirst(req.query, ["sector"]);
    const mohalla = pickFirst(req.query, ["mohalla"]);
    const landmark = pickFirst(req.query, ["landmark"]);
    const minPrice = pickFirst(req.query, ["minPrice"]);
    const maxPrice = pickFirst(req.query, ["maxPrice"]);
    const bedrooms = pickFirst(req.query, ["bedrooms"]);
    const bathrooms = pickFirst(req.query, ["bathrooms"]);
    const minArea = pickFirst(req.query, ["minArea"]);
    const maxArea = pickFirst(req.query, ["maxArea"]);
    const premium = pickFirst(req.query, ["premium"]);
    const featured = pickFirst(req.query, ["featured"]);
    const sortBy = String(pickFirst(req.query, ["sortBy"]) || "date_desc");
    const page = String(pickFirst(req.query, ["page"]) || "1");
    const limit = String(pickFirst(req.query, ["limit"]) || "20");

    const category = normSlug(qCategory);
    let propertyType = normSlug(qPropertyType);

    const normalizedPriceType = normPriceType(priceType);

    // Normalize propertyType alias
    if (propertyType && TYPE_ALIASES[propertyType]) {
      propertyType = TYPE_ALIASES[propertyType];
    }

    // If page passed only `category`, derive propertyType from it when possible
    if (!propertyType && category && TYPE_ALIASES[category]) {
      propertyType = TYPE_ALIASES[category];
    }

    const filter: any = {
      status: "active",
      $or: [
        { approvalStatus: "approved" },
        { approvalStatus: { $exists: false } },
        { approvalStatus: "pending" },
      ],
    };

    // Buy/Rent tab grouping (kept, but now works better when propertyType is provided)
    switch (category) {
      case "buy":
        if (propertyType) {
          filter.propertyType = propertyType;
          filter.priceType = "sale";
        } else {
          filter.$and = [
            {
              $or: [
                { propertyType: "residential", priceType: "sale" },
                { propertyType: "plot", priceType: "sale" },
                { propertyType: "flat", priceType: "sale" },
              ],
            },
            { $or: filter.$or },
          ];
          delete filter.$or;
        }
        break;

      case "rent":
        if (propertyType) {
          filter.propertyType = propertyType;
          filter.priceType = "rent";
        } else {
          filter.$and = [
            {
              $or: [
                { propertyType: "residential", priceType: "rent" },
                { propertyType: "flat", priceType: "rent" },
                { propertyType: "commercial", priceType: "rent" },
              ],
            },
            { $or: filter.$or },
          ];
          delete filter.$or;
        }
        break;

      default:
        if (propertyType) filter.propertyType = propertyType;
        break;
    }

    // ✅ SubCategory / Mini fallback (the big fix)
    const subCategory = normSlug(qSubCategory);

    // If UI mistakenly sends miniSlug in subCategory (example: subCategory=shop),
    // and miniSubcategory is not provided — try to resolve miniSubcategoryId.
    if (subCategory && !qMiniSlug && !qMiniId) {
      const resolvedMini = await resolveMiniBySlugLoose({
        db,
        miniSlug: subCategory,
        categorySlug: category,
        propertyType,
      });

      if (resolvedMini) {
        filter.miniSubcategoryId = resolvedMini;
      } else {
        filter.subCategory = subCategory;
      }
    } else {
      if (subCategory) filter.subCategory = subCategory;
    }

    // ✅ miniSubcategory resolve
    if (qMiniSlug && !qMiniId) {
      const resolved = await resolveMiniSubcategoryId({
        db,
        miniSlug: String(qMiniSlug),
        subSlug: subCategory,
        categorySlug: category,
        propertyType,
        priceType: String(normalizedPriceType || ""),
      });

      if (resolved) {
        filter.miniSubcategoryId = resolved;
      } else {
        console.log("⚠️ miniSubcategory slug provided but not resolved", {
          miniSubcategory: normSlug(qMiniSlug),
          subCategory,
          category,
          propertyType,
        });
      }
    } else if (qMiniId) {
      filter.miniSubcategoryId = String(qMiniId);
    }

    if (normalizedPriceType) filter.priceType = normalizedPriceType;

    // Premium/Featured
    if (String(premium) === "true") filter.premium = true;
    if (String(featured) === "true") filter.featured = true;

    // ✅ Case-insensitive location matching
    if (sector) {
      const s = String(sector).trim();
      filter["location.sector"] = new RegExp(`^${escapeRegex(s)}$`, "i");
    }
    if (mohalla) {
      const m = String(mohalla).trim();
      filter["location.mohalla"] = new RegExp(`^${escapeRegex(m)}$`, "i");
    }
    if (landmark) {
      const l = String(landmark).trim();
      filter["location.landmark"] = new RegExp(`^${escapeRegex(l)}$`, "i");
    }

    if (bedrooms) {
      const b = String(bedrooms);
      if (b === "4+") filter["specifications.bedrooms"] = { $gte: 4 };
      else {
        const n = parseInt(b, 10);
        if (!Number.isNaN(n)) filter["specifications.bedrooms"] = n;
      }
    }
    if (bathrooms) {
      const n = parseInt(String(bathrooms), 10);
      if (!Number.isNaN(n)) filter["specifications.bathrooms"] = n;
    }
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseInt(String(minPrice), 10);
      if (maxPrice) filter.price.$lte = parseInt(String(maxPrice), 10);
    }
    if (minArea || maxArea) {
      filter["specifications.area"] = {};
      if (minArea)
        filter["specifications.area"].$gte = parseInt(String(minArea), 10);
      if (maxArea)
        filter["specifications.area"].$lte = parseInt(String(maxArea), 10);
    }

    console.log("🔍 FILTER PROPERTIES → query", {
      category,
      propertyType,
      priceType: normalizedPriceType,
      subCategory,
      miniSubcategory: qMiniSlug ? normSlug(qMiniSlug) : null,
      miniSubcategoryId: filter.miniSubcategoryId || null,
      appliedFilter: JSON.stringify(filter, null, 2),
    });

    // Sorting
    const sort: any = {};
    switch (sortBy) {
      case "price_asc":
        sort.price = 1;
        break;
      case "price_desc":
        sort.price = -1;
        break;
      case "area_desc":
        sort["specifications.area"] = -1;
        break;
      case "date_asc":
        sort.createdAt = 1;
        break;
      default:
        sort.createdAt = -1;
    }

    const pageNum = parseInt(String(page), 10);
    const limitNum = parseInt(String(limit), 10);
    const skip = (pageNum - 1) * limitNum;

    const properties = await db
      .collection("properties")
      .find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .toArray();

    const total = await db.collection("properties").countDocuments(filter);

    res.json({
      success: true,
      data: {
        properties: properties as unknown as Property[],
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching properties:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch properties" });
  }
};

/* =========================================================================
   PUBLIC: Category page with path params (/categories/:category/:sub?)
   ========================================================================= */
export const listPublicPropertiesByCategory: RequestHandler = async (req, res) => {
  try {
    const category = normSlug(req.params.category);
    const sub = normSlug(req.params.sub || req.params.subcategory || "");

    const q: any = { ...req.query, category };

    // If URL is /categories/buy/:type or /categories/rent/:type
    if (sub) {
      if (TOP_TABS.has(category)) {
        // If :type is a known property group (commercial/agricultural/etc)
        if (TYPE_ALIASES[sub] || PROPERTY_TYPE_CATEGORY_SLUGS.has(sub)) {
          q.propertyType = TYPE_ALIASES[sub] || sub;
          q.priceType = normPriceType(category); // buy→sale, rent/lease→rent
        } else {
          // Otherwise treat it as subCategory slug
          q.subCategory = sub;
          q.priceType = normPriceType(category);
        }
      } else {
        // If category itself is commercial/agricultural/etc, then sub is subCategory/mini slug
        q.subCategory = sub;
      }
    }

    req.query = q;
    // @ts-ignore
    return getProperties(req, res);
  } catch (err) {
    console.error("listPublicPropertiesByCategory error:", err);
    return res.status(500).json({ success: false, error: "Failed to list properties" });
  }
};

/* =========================================================================
   PUBLIC: Get by ID
   ========================================================================= */
export const getPropertyById: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    if (!ObjectId.isValid(id))
      return res
        .status(400)
        .json({ success: false, error: "Invalid property ID" });

    const property = await db
      .collection("properties")
      .findOne({ _id: new ObjectId(id) });
    if (!property)
      return res
        .status(404)
        .json({ success: false, error: "Property not found" });

    await db
      .collection("properties")
      .updateOne({ _id: new ObjectId(id) }, { $inc: { views: 1 } });

    const response: ApiResponse<Property> = {
      success: true,
      data: property as unknown as Property,
    };
    res.json(response);
  } catch (error) {
    console.error("Error fetching property:", error);
    res.status(500).json({ success: false, error: "Failed to fetch property" });
  }
};

/* =========================================================================
   CREATE: FREE / pre-PAID (ALWAYS pending)
   ========================================================================= */
export const createProperty: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const userId = (req as any).userId;
    if (!userId)
      return res
        .status(401)
        .json({ success: false, error: "User not authenticated" });

    // images
    const images: string[] = [];
    if (Array.isArray((req as any).files)) {
      (req as any).files.forEach((file: any) =>
        images.push(`/uploads/properties/${file.filename}`),
      );
    }

    // safe parse
    const safeParse = <T = any>(v: any, fallback: any = {}): T => {
      if (typeof v === "string") {
        try {
          return JSON.parse(v);
        } catch {
          return fallback;
        }
      }
      return (v ?? fallback) as T;
    };
    const location = safeParse(req.body.location, {});
    const specifications = safeParse(req.body.specifications, {});
    const amenities = safeParse(req.body.amenities, []);
    const contactInfo = safeParse(req.body.contactInfo, {});
    const shareContactInfo =
      typeof req.body.shareContactInfo === "string"
        ? req.body.shareContactInfo === "true"
        : !!req.body.shareContactInfo;

    const providedPremium = req.body.premium === "true";
    const contactVisibleFlag =
      typeof req.body.contactVisible === "string"
        ? req.body.contactVisible === "true"
        : !!req.body.contactVisible;

    const packageId: string | undefined =
      typeof req.body.packageId === "string" && req.body.packageId.trim()
        ? req.body.packageId.trim()
        : undefined;

    const approvalStatus: "pending" | "pending_approval" = packageId
      ? "pending_approval"
      : "pending";
    const status: "inactive" | "active" = packageId ? "inactive" : "active";

    let normalizedPropertyType = normSlug(req.body.propertyType);
    if (TYPE_ALIASES[normalizedPropertyType]) {
      normalizedPropertyType = TYPE_ALIASES[normalizedPropertyType];
    }

    const subCategorySlug = normSlug(
      req.body.subCategory || req.body.subcategory || "",
    );

    // ✅ Accept multiple keys for mini slug
    const miniSubcategorySlug = normSlug(
      req.body.miniSubcategorySlug ||
        req.body.miniSubcategory ||
        req.body.mini ||
        "",
    );

    const explicitCategoryFromBody = normSlug(
      req.body.category || req.body.categorySlug || "",
    );
    const priceTypeValue = normPriceType(req.body.priceType);

    let miniSubcategoryId: string | undefined = undefined;
    if (miniSubcategorySlug && subCategorySlug) {
      miniSubcategoryId = await resolveMiniSubcategoryId({
        db,
        miniSlug: miniSubcategorySlug,
        subSlug: subCategorySlug,
        categorySlug: explicitCategoryFromBody,
        propertyType: normalizedPropertyType,
        priceType: priceTypeValue,
      });
    }

    const propertyData: Omit<Property, "_id"> & {
      packageId?: string;
      isApproved?: boolean;
      approvedBy?: string;
      rejectionReason?: string;
      adminComments?: string;
      isPaid?: boolean;
      paymentStatus?: "unpaid" | "paid" | "failed";
      lastPaymentAt?: Date | null;
      package?: any;
      packageExpiry?: Date | null;
    } = {
      title: req.body.title,
      description: req.body.description,
      price: toInt(req.body.price) ?? 0,
      priceType: req.body.priceType,
      propertyType: normalizedPropertyType,
      subCategory: subCategorySlug,
      ...(miniSubcategoryId ? { miniSubcategoryId } : {}),
      location,
      specifications: {
        ...specifications,
        bedrooms: toInt(specifications.bedrooms),
        bathrooms: toInt(specifications.bathrooms),
        area: toInt(specifications.area),
        floor: toInt(specifications.floor),
        totalFloors: toInt(specifications.totalFloors),
        parking:
          typeof specifications.parking === "string"
            ? specifications.parking === "yes"
            : !!specifications.parking,
      },
      images,
      amenities: Array.isArray(amenities) ? amenities : [],
      ownerId: String(userId),
      ownerType: (req as any).userType || "seller",
      contactInfo,
      shareContactInfo,

      status,
      approvalStatus,
      isApproved: false,
      featured: false,
      premium: providedPremium || !!packageId,
      contactVisible: contactVisibleFlag,

      isPaid: false,
      paymentStatus: "unpaid",
      lastPaymentAt: null,
      package: null,
      packageExpiry: null,

      views: 0,
      inquiries: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...(packageId ? { packageId } : {}),
    };

    console.log("📥 CREATE PROPERTY → enforced", {
      title: propertyData.title,
      propertyType: propertyData.propertyType,
      subCategory: propertyData.subCategory,
      miniSubcategorySlug: miniSubcategorySlug || null,
      miniSubcategoryId: propertyData.miniSubcategoryId || null,
      status: propertyData.status,
      approvalStatus: propertyData.approvalStatus,
      premium: propertyData.premium,
      packageId: propertyData.packageId || null,
    });

    // Free post limit enforcement (unchanged)
    if (!propertyData.packageId) {
      const userIdStr = String(userId);

      const user = await db
        .collection("users")
        .findOne({ _id: new ObjectId(userIdStr) });

      let FREE_POST_LIMIT = 5;
      let FREE_POST_PERIOD_DAYS = 30;

      if (user?.freeListingLimit) {
        FREE_POST_LIMIT = user.freeListingLimit.limit;
        FREE_POST_PERIOD_DAYS = user.freeListingLimit.limitType;
      } else {
        const adminSettings = await db
          .collection("adminSettings")
          .findOne({ _id: "freeListingLimits" });

        if (adminSettings) {
          FREE_POST_LIMIT = adminSettings.defaultLimit || 5;
          FREE_POST_PERIOD_DAYS = adminSettings.defaultLimitType || 30;
        } else {
          FREE_POST_LIMIT = process.env.FREE_POST_LIMIT
            ? Number(process.env.FREE_POST_LIMIT)
            : 5;
          FREE_POST_PERIOD_DAYS = process.env.FREE_POST_PERIOD_DAYS
            ? Number(process.env.FREE_POST_PERIOD_DAYS)
            : 30;
        }
      }

      const periodStart = new Date(
        Date.now() - FREE_POST_PERIOD_DAYS * 24 * 60 * 60 * 1000,
      );

      const freePostsCount = await db.collection("properties").countDocuments({
        ownerId: userIdStr,
        createdAt: { $gte: periodStart },
        $or: [
          { packageId: { $exists: false } },
          { packageId: null },
          { isPaid: false },
        ],
      });

      if (freePostsCount >= FREE_POST_LIMIT) {
        return res.status(403).json({
          success: false,
          error: `Free listing limit reached: ${FREE_POST_LIMIT} free posts allowed per ${FREE_POST_PERIOD_DAYS} days.`,
        });
      }
    }

    const result = await db.collection("properties").insertOne(propertyData);
    const propertyId = result.insertedId.toString();

    // confirmation email (best-effort)
    try {
      const user = await db
        .collection("users")
        .findOne({ _id: new ObjectId(String(userId)) });
      if (user?.email) {
        await sendPropertyConfirmationEmail(
          user.email,
          user.name || "User",
          propertyData.title,
          propertyId,
        );
      }
    } catch (e) {
      console.warn(
        "Property confirmation email failed:",
        (e as any)?.message || e,
      );
    }

    const response: ApiResponse<{ _id: string }> = {
      success: true,
      data: { _id: propertyId },
      message:
        "Property submitted. ⏳ Pending Admin Approval. Paid listings go live only after payment verification + admin approval.",
    };
    res.status(201).json(response);
  } catch (error) {
    console.error("Error creating property:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to create property" });
  }
};

/* =========================================================================
   PUBLIC: Featured
   ========================================================================= */
export const getFeaturedProperties: RequestHandler = async (_req, res) => {
  try {
    const db = getDatabase();
    const properties = await db
      .collection("properties")
      .find({ status: "active", featured: true, approvalStatus: "approved" })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    const response: ApiResponse<Property[]> = {
      success: true,
      data: properties as unknown as Property[],
    };
    res.json(response);
  } catch (error) {
    console.error("Error fetching featured properties:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch featured properties" });
  }
};

/* =========================================================================
   USER Dashboard: My Properties
   ========================================================================= */
export const getUserProperties: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const userId = (req as any).userId;
    if (!userId)
      return res
        .status(401)
        .json({ success: false, error: "User not authenticated" });

    const properties = await db
      .collection("properties")
      .find({ ownerId: String(userId) })
      .sort({ createdAt: -1 })
      .toArray();

    const response: ApiResponse<Property[]> = {
      success: true,
      data: properties as unknown as Property[],
    };
    res.json(response);
  } catch (error) {
    console.error("Error fetching user properties:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch user properties" });
  }
};

/* =========================================================================
   USER Notifications
   ========================================================================= */
export const getUserNotifications: RequestHandler = async (req, res) => {
  try {
    const userId = (req as any).userId;
    const userType = (req as any).userType;
    const db = getDatabase();

    const userIdObj = new ObjectId(String(userId));

    const userNotifications = await db
      .collection("user_notifications")
      .find({ userId: userIdObj })
      .sort({ createdAt: -1 })
      .toArray();

    let sellerNotifications: any[] = [];
    if (["seller", "agent", "admin"].includes(String(userType || ""))) {
      sellerNotifications = await db
        .collection("notifications")
        .find({ sellerId: userIdObj })
        .sort({ createdAt: -1 })
        .toArray();
    }

    const userNotifsWithSource = userNotifications.map((n) => ({
      ...n,
      _notificationSource: "user_notifications",
    }));
    const sellerNotifsWithSource = sellerNotifications.map((n) => ({
      ...n,
      _notificationSource: "notifications",
    }));

    const allNotifications = [
      ...userNotifsWithSource,
      ...sellerNotifsWithSource,
    ].sort(
      (a, b) =>
        new Date(b.createdAt || b.sentAt).getTime() -
        new Date(a.createdAt || a.sentAt).getTime(),
    );

    res.json({ success: true, data: allNotifications });
  } catch (error) {
    console.error("Error fetching user notifications:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch notifications" });
  }
};

export const markUserNotificationAsRead: RequestHandler = async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { notificationId } = req.params;
    const db = getDatabase();

    if (!ObjectId.isValid(String(notificationId))) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid notification ID" });
    }

    await db.collection("user_notifications").updateOne(
      {
        _id: new ObjectId(String(notificationId)),
        userId: new ObjectId(String(userId)),
      },
      { $set: { isRead: true, readAt: new Date() } },
    );

    res.json({ success: true, message: "Notification marked as read" });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to mark notification as read" });
  }
};

export const deleteUserNotification: RequestHandler = async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { notificationId } = req.params;
    const db = getDatabase();

    if (!ObjectId.isValid(String(notificationId))) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid notification ID" });
    }

    await db.collection("user_notifications").deleteOne({
      _id: new ObjectId(String(notificationId)),
      userId: new ObjectId(String(userId)),
    });

    res.json({ success: true, message: "Notification deleted" });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to delete notification" });
  }
};

/* =========================================================================
   ADMIN: Pending list
   ========================================================================= */
export const getPendingProperties: RequestHandler = async (_req, res) => {
  try {
    const db = getDatabase();
    const properties = await db
      .collection("properties")
      .find({ approvalStatus: { $in: ["pending", "pending_approval"] } })
      .sort({ createdAt: -1 })
      .toArray();

    const response: ApiResponse<Property[]> = {
      success: true,
      data: properties as unknown as Property[],
    };
    res.json(response);
  } catch (error) {
    console.error("Error fetching pending properties:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch pending properties" });
  }
};

/* =========================================================================
   ADMIN: Approve / Reject
   ========================================================================= */
export const updatePropertyApproval: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { approvalStatus, adminComments, rejectionReason } = req.body as {
      approvalStatus: "approved" | "rejected";
      adminComments?: string;
      rejectionReason?: string;
    };
    const adminId = (req as any).userId;

    if (!ObjectId.isValid(String(id)))
      return res
        .status(400)
        .json({ success: false, error: "Invalid property ID" });
    if (!["approved", "rejected"].includes(String(approvalStatus)))
      return res
        .status(400)
        .json({ success: false, error: "Invalid approval status" });

    const _id = new ObjectId(String(id));
    const property = await db.collection("properties").findOne({ _id });
    if (!property)
      return res
        .status(404)
        .json({ success: false, error: "Property not found" });

    const now = new Date();
    const updateData: any = { approvalStatus, updatedAt: now };

    if (approvalStatus === "approved") {
      updateData.status = "active";
      updateData.isApproved = true;
      updateData.approvedAt = now;
      updateData.approvedBy = String(adminId || "");
    } else {
      updateData.status = "inactive";
      updateData.isApproved = false;
      if (rejectionReason) updateData.rejectionReason = rejectionReason;
    }
    if (adminComments) updateData.adminComments = adminComments;

    await db.collection("properties").updateOne({ _id }, { $set: updateData });

    try {
      if (approvalStatus === "approved") {
        const owner = await db
          .collection("users")
          .findOne({ _id: new ObjectId(property.ownerId) });
        if (owner?.email) {
          await sendPropertyApprovalEmail(
            owner.email,
            owner.name || "User",
            property.title,
          );
        }
      }
    } catch (e) {
      console.warn("Approval email failed:", (e as any)?.message || e);
    }

    const response: ApiResponse<{ message: string }> = {
      success: true,
      data: { message: `Property ${approvalStatus} successfully` },
    };
    res.json(response);
  } catch (error) {
    console.error("Error updating property approval:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to update property approval" });
  }
};

/* =========================================================================
   USER: Edit/Update Property
   ========================================================================= */
export const updateProperty: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const userId = (req as any).userId;
    const { id } = req.params;

    if (!userId)
      return res
        .status(401)
        .json({ success: false, error: "User not authenticated" });
    if (!ObjectId.isValid(id))
      return res
        .status(400)
        .json({ success: false, error: "Invalid property ID" });

    const propertyId = new ObjectId(id);

    const property = await db
      .collection("properties")
      .findOne({ _id: propertyId });
    if (!property)
      return res
        .status(404)
        .json({ success: false, error: "Property not found" });

    const propertyOwnerId = String(property.ownerId);
    const requestUserId = String(userId);
    if (propertyOwnerId !== requestUserId) {
      return res.status(403).json({
        success: false,
        error: "You can only edit your own properties",
      });
    }

    const images: string[] = [];
    if (Array.isArray((req as any).files)) {
      (req as any).files.forEach((file: any) => {
        images.push(`/uploads/properties/${file.filename}`);
      });
    }
    const finalImages = images.length > 0 ? images : property.images || [];

    const safeParse = <T = any>(v: any, fallback: any = {}): T => {
      if (typeof v === "string") {
        try {
          return JSON.parse(v);
        } catch {
          return fallback;
        }
      }
      return (v ?? fallback) as T;
    };

    const location = safeParse(req.body.location, property.location || {});
    const specifications = safeParse(
      req.body.specifications,
      property.specifications || {},
    );
    const amenities = safeParse(req.body.amenities, property.amenities || []);
    const contactInfo = safeParse(
      req.body.contactInfo,
      property.contactInfo || {},
    );
    const shareContactInfo =
      typeof req.body.shareContactInfo === "string"
        ? req.body.shareContactInfo === "true"
        : req.body.shareContactInfo !== undefined
          ? !!req.body.shareContactInfo
          : property.shareContactInfo || false;

    let normalizedPropertyType = normSlug(
      req.body.propertyType || property.propertyType,
    );
    if (TYPE_ALIASES[normalizedPropertyType]) {
      normalizedPropertyType = TYPE_ALIASES[normalizedPropertyType];
    }

    const subCategorySlug = normSlug(
      req.body.subCategory || req.body.subcategory || property.subCategory || "",
    );

    const miniSlug = normSlug(
      req.body.miniSubcategorySlug || req.body.miniSubcategory || req.body.mini || "",
    );

    const explicitCategoryFromBody = normSlug(req.body.category || req.body.categorySlug || "");
    const priceTypeValue = normPriceType(req.body.priceType || property.priceType);

    let miniSubcategoryIdUpdate: string | undefined = property.miniSubcategoryId;

    if (miniSlug && subCategorySlug) {
      const resolved = await resolveMiniSubcategoryId({
        db,
        miniSlug,
        subSlug: subCategorySlug,
        categorySlug: explicitCategoryFromBody,
        propertyType: normalizedPropertyType,
        priceType: priceTypeValue,
      });
      if (resolved) miniSubcategoryIdUpdate = resolved;
    }

    const updateData: any = {
      title: req.body.title || property.title,
      description: req.body.description || property.description,
      price: Number(req.body.price) || property.price,
      priceType: req.body.priceType || property.priceType,
      propertyType: normalizedPropertyType,
      subCategory: subCategorySlug,
      ...(miniSubcategoryIdUpdate
        ? { miniSubcategoryId: miniSubcategoryIdUpdate }
        : {}),
      location,
      specifications: {
        ...specifications,
        bedrooms:
          Number(specifications.bedrooms) || property.specifications?.bedrooms,
        bathrooms:
          Number(specifications.bathrooms) ||
          property.specifications?.bathrooms,
        area: Number(specifications.area) || property.specifications?.area,
        floor: Number(specifications.floor) || property.specifications?.floor,
        totalFloors:
          Number(specifications.totalFloors) ||
          property.specifications?.totalFloors,
      },
      images: finalImages,
      amenities: Array.isArray(amenities) ? amenities : [],
      contactInfo,
      shareContactInfo,
      updatedAt: new Date(),
    };

    if (
      property.approvalStatus === "approved" ||
      property.status === "active"
    ) {
      updateData.approvalStatus = "pending";
      updateData.status = "inactive";
      updateData.isApproved = false;
    }

    await db
      .collection("properties")
      .updateOne({ _id: propertyId }, { $set: updateData });

    console.log("📝 PROPERTY UPDATED → reset to pending", {
      propertyId: id,
      title: updateData.title,
      newApprovalStatus: updateData.approvalStatus,
      newStatus: updateData.status,
      miniSubcategoryId: updateData.miniSubcategoryId || null,
    });

    const response: ApiResponse<{ message: string; approvalStatus: string }> = {
      success: true,
      data: {
        message: "Property updated and set to pending review",
        approvalStatus: updateData.approvalStatus || "pending",
      },
    };
    res.json(response);
  } catch (error) {
    console.error("Error updating property:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to update property" });
  }
};
