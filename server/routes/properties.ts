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
const uploadDir = path.join(process.cwd(), "uploads", "properties");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (
  _req: any,
  file: Express.Multer.File,
  cb: FileFilterCallback,
) => {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Only JPG/PNG/WEBP images are allowed"));
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 8 * 1024 * 1024 },
});

/* =========================================================================
   Helpers
   ========================================================================= */
function normSlug(v: any): string {
  return String(v || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

function toInt(v: any): number | undefined {
  if (v === undefined || v === null) return undefined;
  const n = Number(v);
  if (Number.isNaN(n)) return undefined;
  return Math.floor(n);
}

function pickFirst(obj: any, keys: string[]): any {
  for (const k of keys) {
    const v = obj?.[k];
    if (Array.isArray(v)) {
      const f = v.find((x) => x !== undefined && x !== null && String(x).trim() !== "");
      if (f !== undefined) return f;
    }
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return undefined;
}

/* =========================================================================
   Slug aliases
   ========================================================================= */
const TYPE_ALIASES: Record<string, string> = {
  // Commercial
  shop: "commercial",
  showroom: "commercial",
  office: "commercial",
  warehouse: "commercial",
  industrial: "commercial",

  // Residential
  house: "residential",
  villa: "residential",
  apartment: "flat",
  flat: "flat",

  // Plot / Land
  plot: "plot",
  land: "plot",

  // Agricultural
  agricultural: "agricultural",
  farm: "agricultural",

  // PG / Co-living
  pg: "pg",
  "co-living": "pg",
  coliving: "pg",
};

const TOP_TABS = new Set(["buy", "rent", "sale", "lease", "pg"]);

const PROPERTY_TYPE_CATEGORY_SLUGS = new Set([
  "commercial",
  "residential",
  "plot",
  "flat",
  "agricultural",
  "pg",
]);

function normPriceType(v: any): "sale" | "rent" | "" {
  const s = normSlug(v);
  if (["sale", "buy"].includes(s)) return "sale";
  if (["rent", "lease", "pg"].includes(s)) return "rent";
  return "";
}

/* =========================================================================
   MiniSubcategory resolver (kept)
   ========================================================================= */
async function resolveMiniSubcategoryId(opts: {
  db: any;
  miniSlug: string;
  subSlug: string;
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

  // ✅ 1) If propertyType looks like a real category group,
  //     try that category first (commercial/residential/plot/flat/agricultural/pg)
  if (propertyType && PROPERTY_TYPE_CATEGORY_SLUGS.has(propertyType)) {
    candidates.push(propertyType);
  }

  // ✅ 2) If categorySlug itself is a real group and not a top tab, try it
  if (categorySlug && !TOP_TABS.has(categorySlug)) {
    candidates.push(categorySlug);
  }

  // ✅ 3) If categorySlug is a top-tab (buy/rent), we still want to try it
  if (categorySlug && TOP_TABS.has(categorySlug)) {
    candidates.push(categorySlug);
  }

  // ✅ 4) Fallback by priceType (sale->buy, rent->rent)
  if (priceType === "rent") candidates.push("rent");
  else candidates.push("buy");

  // Remove duplicates
  const uniqueCandidates = [...new Set(candidates)].filter(Boolean);

  for (const catSlug of uniqueCandidates) {
    const parentCategory = await db.collection("categories").findOne({
      slug: catSlug,
    });

    if (!parentCategory?._id) continue;

    const sub = await db.collection("subcategories").findOne({
      slug: subSlug,
      categoryId: parentCategory._id.toString(),
    });

    if (!sub?._id) continue;

    const mini = await db.collection("mini_subcategories").findOne({
      slug: miniSlug,
      subcategoryId: sub._id.toString(),
    });

    if (mini?._id) return mini._id.toString();
  }

  // final fallback: try unique mini slug across all minis (only if unique)
  const minis = await db
    .collection("mini_subcategories")
    .find({ slug: miniSlug })
    .project({ _id: 1 })
    .limit(2)
    .toArray();

  if (minis.length === 1 && minis[0]?._id) return minis[0]._id.toString();
  return undefined;
}

async function resolveMiniBySlugLoose(opts: {
  db: any;
  miniSlug: string;
  categorySlug?: string;
  propertyType?: string;
}): Promise<string | undefined> {
  const { db } = opts;
  const miniSlug = normSlug(opts.miniSlug);
  const categorySlug = normSlug(opts.categorySlug);
  const propertyType = normSlug(opts.propertyType);

  if (!miniSlug) return undefined;

  const candidates: string[] = [];

  if (propertyType && PROPERTY_TYPE_CATEGORY_SLUGS.has(propertyType)) candidates.push(propertyType);
  if (categorySlug) candidates.push(categorySlug);

  const uniqueCandidates = [...new Set(candidates)].filter(Boolean);

  // 1) Try via category -> its subcategories -> find matching mini
  for (const catSlug of uniqueCandidates) {
    const parentCategory = await db.collection("categories").findOne({
      slug: catSlug,
    });
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
      "miniSubCategory",
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

    // ✅ If URL is like ?category=buy&subCategory=commercial..., treat subCategory as propertyType group when possible
    const subCategoryForType = normSlug(qSubCategory);
    if (
      !propertyType &&
      TOP_TABS.has(category) &&
      subCategoryForType &&
      (TYPE_ALIASES[subCategoryForType] ||
        PROPERTY_TYPE_CATEGORY_SLUGS.has(subCategoryForType))
    ) {
      propertyType = TYPE_ALIASES[subCategoryForType] || subCategoryForType;
    }

    const filter: any = {
      status: "active",
      $or: [
        { approvalStatus: "approved" },
        { approvalStatus: { $exists: false } },
      ],
    };

    // Buy/Rent tab grouping (now includes commercial/agricultural in BUY)
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
                { propertyType: "commercial", priceType: "sale" },
                { propertyType: "agricultural", priceType: "sale" },
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
                { propertyType: "pg", priceType: "rent" },
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

    // ✅ SubCategory / Mini fallback
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

    // Location filters
    if (sector) filter["location.sector"] = normSlug(sector);
    if (mohalla) filter["location.mohalla"] = normSlug(mohalla);
    if (landmark) filter["location.landmark"] = normSlug(landmark);

    // price range
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = toInt(minPrice);
      if (maxPrice) filter.price.$lte = toInt(maxPrice);
    }

    // specs
    if (bedrooms) filter["specifications.bedrooms"] = toInt(bedrooms);
    if (bathrooms) filter["specifications.bathrooms"] = toInt(bathrooms);

    // area range
    if (minArea || maxArea) {
      filter["specifications.area"] = {};
      if (minArea) filter["specifications.area"].$gte = toInt(minArea);
      if (maxArea) filter["specifications.area"].$lte = toInt(maxArea);
    }

    // Sorting
    const sort: any = {};
    switch (sortBy) {
      case "price_asc":
        sort.price = 1;
        break;
      case "price_desc":
        sort.price = -1;
        break;
      case "views_desc":
        sort.views = -1;
        break;
      case "date_asc":
        sort.createdAt = 1;
        break;
      case "premium_first":
        sort.premium = -1;
        sort.createdAt = -1;
        break;
      default:
        sort.createdAt = -1;
        break;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      db
        .collection("properties")
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .toArray(),
      db.collection("properties").countDocuments(filter),
    ]);

    const response: ApiResponse<any> = {
      success: true,
      data: {
        properties: items as any[],
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        filtersApplied: {
          category,
          propertyType,
          subCategory: filter.subCategory || null,
          miniSubcategoryId: filter.miniSubcategoryId || null,
          priceType: filter.priceType || null,
        },
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching properties:", error);
    res.status(500).json({ success: false, error: "Failed to fetch properties" });
  }
};

/* =========================================================================
   PUBLIC: Get single property + view increment
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

    // Normalize propertyType (UI sometimes sends propertyType=buy/rent; DB expects commercial/residential/etc)
    const requestedTab = normSlug(req.body.propertyType);
    let normalizedPropertyType = requestedTab;

    // Normalize aliases (shop/showroom/office -> commercial etc.)
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

    // If propertyType is a top-tab (buy/rent/lease/pg), derive real propertyType from subCategory when possible
    if (
      TOP_TABS.has(requestedTab) &&
      subCategorySlug &&
      (TYPE_ALIASES[subCategorySlug] ||
        PROPERTY_TYPE_CATEGORY_SLUGS.has(subCategorySlug))
    ) {
      normalizedPropertyType = TYPE_ALIASES[subCategorySlug] || subCategorySlug;
    }

    // Normalize priceType for DB (buy->sale, rent/lease/pg->rent)
    let priceTypeValue = normPriceType(
      req.body.priceType || requestedTab || explicitCategoryFromBody,
    );
    if (requestedTab === "buy" || explicitCategoryFromBody === "buy")
      priceTypeValue = "sale";
    if (["rent", "lease", "pg"].includes(requestedTab) ||
        ["rent", "lease", "pg"].includes(explicitCategoryFromBody))
      priceTypeValue = "rent";

    // Help mini resolver: if category not sent but propertyType was buy/rent, use that
    const categoryForMiniResolve =
      explicitCategoryFromBody || (TOP_TABS.has(requestedTab) ? requestedTab : "");

    let miniSubcategoryId: string | undefined = undefined;
    if (miniSubcategorySlug && subCategorySlug) {
      miniSubcategoryId = await resolveMiniSubcategoryId({
        db,
        miniSlug: miniSubcategorySlug,
        subSlug: subCategorySlug,
        categorySlug: categoryForMiniResolve,
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
      priceType: priceTypeValue,
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
      miniSubcategoryId: (propertyData as any).miniSubcategoryId || null,
      status: propertyData.status,
      approvalStatus: propertyData.approvalStatus,
      premium: propertyData.premium,
      packageId: (propertyData as any).packageId || null,
      priceType: propertyData.priceType,
    });

    // Free post limit enforcement (unchanged)
    if (!(propertyData as any).packageId) {
      const userIdStr = String(userId);

      const user = await db
        .collection("users")
        .findOne({ _id: new ObjectId(userIdStr) });

      let FREE_POST_LIMIT = 5;
      let FREE_POST_PERIOD_DAYS = 30;

      if (user?.freeListingLimit) {
        FREE_POST_LIMIT = user.freeListingLimit.limit;
        FREE_POST_PERIOD_DAYS = user.freeListingLimit.periodDays;
      }

      const since = new Date();
      since.setDate(since.getDate() - FREE_POST_PERIOD_DAYS);

      const count = await db.collection("properties").countDocuments({
        ownerId: userIdStr,
        packageId: { $exists: false },
        createdAt: { $gte: since },
      });

      if (count >= FREE_POST_LIMIT) {
        return res.status(400).json({
          success: false,
          error: `Free listing limit reached (${FREE_POST_LIMIT}/${FREE_POST_PERIOD_DAYS} days).`,
        });
      }
    }

    const result = await db.collection("properties").insertOne(propertyData);

    // Confirmation email (best effort)
    try {
      const user = await db
        .collection("users")
        .findOne({ _id: new ObjectId(String(userId)) });

      const to = String(contactInfo?.email || user?.email || "").trim();
      const name =
        String(contactInfo?.name || user?.name || "User").trim() || "User";

      if (to) {
        await sendPropertyConfirmationEmail(
          to,
          name,
          propertyData.title,
          String(result.insertedId),
        );
      }
    } catch (e) {
      console.log("Email send failed (confirmation):", e);
    }

    const response: ApiResponse<any> = {
      success: true,
      data: {
        message: "Property created successfully",
        propertyId: result.insertedId,
        approvalStatus: propertyData.approvalStatus,
      },
    };
    res.status(201).json(response);
  } catch (error) {
    console.error("Error creating property:", error);
    res.status(500).json({ success: false, error: "Failed to create property" });
  }
};

/* =========================================================================
   ADMIN: approve/reject + publish paid
   ========================================================================= */
export const updatePropertyApproval: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    if (!ObjectId.isValid(id))
      return res
        .status(400)
        .json({ success: false, error: "Invalid property ID" });

    const { approvalStatus, rejectionReason, adminComments } = req.body;

    const update: any = {
      approvalStatus,
      updatedAt: new Date(),
    };

    if (approvalStatus === "approved") {
      update.isApproved = true;
      update.status = "active";
      update.approvedBy = (req as any).userId || "admin";
      update.rejectionReason = null;
      update.adminComments = adminComments || null;
    }

    if (approvalStatus === "rejected") {
      update.isApproved = false;
      update.status = "inactive";
      update.rejectionReason = rejectionReason || "Rejected by admin";
      update.adminComments = adminComments || null;
    }

    await db
      .collection("properties")
      .updateOne({ _id: new ObjectId(id) }, { $set: update });

    // Approval email (best effort)
    try {
      const prop = await db
        .collection("properties")
        .findOne({ _id: new ObjectId(id) });

      if (prop) {
        const user = prop.ownerId
          ? await db
              .collection("users")
              .findOne({ _id: new ObjectId(String(prop.ownerId)) })
          : null;

        const to = String(prop?.contactInfo?.email || user?.email || "").trim();
        const name =
          String(prop?.contactInfo?.name || user?.name || "User").trim() ||
          "User";

        const isApproved = approvalStatus === "approved";

        if (to) {
          await sendPropertyApprovalEmail(
            to,
            name,
            String(prop.title || "Your Property"),
            String(prop._id),
            isApproved,
            rejectionReason || undefined,
          );
        }
      }
    } catch (e) {
      console.log("Email send failed (approval):", e);
    }

    res.json({ success: true, data: { message: "Approval status updated" } });
  } catch (error) {
    console.error("Error updating approval:", error);
    res.status(500).json({ success: false, error: "Failed to update approval" });
  }
};

/* =========================================================================
   UPDATE property (owner)
   ========================================================================= */
export const updateProperty: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const userId = (req as any).userId;
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

    if (String(property.ownerId) !== String(userId)) {
      return res.status(403).json({
        success: false,
        error: "You are not allowed to update this property",
      });
    }

    // safe parse (same helper logic)
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
    const specifications = safeParse(req.body.specifications, property.specifications || {});
    const amenities = safeParse(req.body.amenities, property.amenities || []);
    const contactInfo = safeParse(req.body.contactInfo, property.contactInfo || {});

    // Normalize propertyType (UI sometimes sends buy/rent; DB expects commercial/residential/etc)
    const requestedTab = normSlug(req.body.propertyType || property.propertyType);
    let normalizedPropertyType = requestedTab;

    if (TYPE_ALIASES[normalizedPropertyType]) {
      normalizedPropertyType = TYPE_ALIASES[normalizedPropertyType];
    }

    const subCategorySlug = normSlug(
      req.body.subCategory || req.body.subcategory || property.subCategory || "",
    );

    const miniSlug = normSlug(
      req.body.miniSubcategorySlug ||
        req.body.miniSubcategory ||
        req.body.mini ||
        "",
    );

    const explicitCategoryFromBody = normSlug(
      req.body.category || req.body.categorySlug || "",
    );

    // If propertyType is a top-tab (buy/rent/lease/pg), derive real propertyType from subCategory when possible
    if (
      TOP_TABS.has(requestedTab) &&
      subCategorySlug &&
      (TYPE_ALIASES[subCategorySlug] ||
        PROPERTY_TYPE_CATEGORY_SLUGS.has(subCategorySlug))
    ) {
      normalizedPropertyType = TYPE_ALIASES[subCategorySlug] || subCategorySlug;
    }

    // Normalize priceType for DB
    let priceTypeValue = normPriceType(
      req.body.priceType || property.priceType || requestedTab || explicitCategoryFromBody,
    );
    if (requestedTab === "buy" || explicitCategoryFromBody === "buy")
      priceTypeValue = "sale";
    if (["rent", "lease", "pg"].includes(requestedTab) ||
        ["rent", "lease", "pg"].includes(explicitCategoryFromBody))
      priceTypeValue = "rent";

    const categoryForMiniResolve =
      explicitCategoryFromBody || (TOP_TABS.has(requestedTab) ? requestedTab : "");

    let miniSubcategoryIdUpdate: string | undefined = undefined;
    if (miniSlug && subCategorySlug) {
      miniSubcategoryIdUpdate = await resolveMiniSubcategoryId({
        db,
        miniSlug,
        subSlug: subCategorySlug,
        categorySlug: categoryForMiniResolve,
        propertyType: normalizedPropertyType,
        priceType: priceTypeValue,
      });
    }

    const updateData: any = {
      title: req.body.title ?? property.title,
      description: req.body.description ?? property.description,
      price: toInt(req.body.price) ?? property.price ?? 0,
      priceType: priceTypeValue || property.priceType,
      propertyType: normalizedPropertyType || property.propertyType,
      subCategory: subCategorySlug || property.subCategory,
      ...(miniSubcategoryIdUpdate ? { miniSubcategoryId: miniSubcategoryIdUpdate } : {}),
      location,
      specifications: {
        ...specifications,
        bedrooms: toInt(specifications.bedrooms),
        bathrooms: toInt(specifications.bathrooms),
        area: toInt(specifications.area),
        floor: toInt(specifications.floor),
        totalFloors: toInt(specifications.totalFloors),
      },
      amenities: Array.isArray(amenities) ? amenities : [],
      contactInfo,
      updatedAt: new Date(),

      // whenever updated -> pending
      approvalStatus: "pending",
      isApproved: false,
      status: "inactive",
    };

    await db
      .collection("properties")
      .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    const response: ApiResponse<any> = {
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



export const getFeaturedProperties: RequestHandler = async (req, res) => {
  const db = getDatabase();
  const items = await db
    .collection("properties")
    .find({ featured: true, status: "active" })
    .sort({ createdAt: -1 })
    .limit(20)
    .toArray();

  res.json({ success: true, data: { properties: items } });
};

