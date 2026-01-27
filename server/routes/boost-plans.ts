import { RequestHandler } from "express";
import { getDatabase } from "../db/mongodb";
import { ObjectId, Db } from "mongodb";

// BoostPlan interface
interface BoostPlan {
  _id?: string;
  name: string;
  description: string;
  price: number;
  duration: number; // in hours
  features: string[];
  active: boolean;
  sortOrder?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Initialize default boost plans
async function initializeBoostPlans(db: Db) {
  const existingPlans = await db.collection("boost_plans").countDocuments();
  if (existingPlans > 0) return;

  const defaultPlans: Omit<BoostPlan, "_id">[] = [
    {
      name: "24 Hour Boost",
      description: "Boost your property for 24 hours to get more visibility",
      price: 99,
      duration: 24,
      features: [
        "Featured in homepage",
        "Priority in search results",
        "Highlighted listing",
        "24 hours visibility boost",
      ],
      active: true,
      sortOrder: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: "48 Hour Boost",
      description: "Extended boost for 48 hours - maximum exposure",
      price: 149,
      duration: 48,
      features: [
        "Featured in homepage",
        "Priority in search results",
        "Highlighted listing",
        "48 hours visibility boost",
        "Badge on listing",
      ],
      active: true,
      sortOrder: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  await db.collection("boost_plans").insertMany(defaultPlans);
  console.log("✅ Initialized 2 default boost plans");
}

// Get all boost plans
export const getBoostPlans: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    await initializeBoostPlans(db);
    
    const { active } = req.query;
    const filter: any = {};
    if (active === "true") filter.active = true;

    const plans = await db
      .collection("boost_plans")
      .find(filter)
      .sort({ sortOrder: 1 })
      .toArray();

    res.json({ success: true, data: plans });
  } catch (error: any) {
    console.error("Error fetching boost plans:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create boost plan
export const createBoostPlan: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const plan = {
      ...req.body,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("boost_plans").insertOne(plan);
    res.json({ success: true, data: { ...plan, _id: result.insertedId } });
  } catch (error: any) {
    console.error("Error creating boost plan:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update boost plan
export const updateBoostPlan: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    
    const result = await db.collection("boost_plans").findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { ...req.body, updatedAt: new Date() } },
      { returnDocument: "after" }
    );

    if (!result) {
      return res.status(404).json({ success: false, error: "Plan not found" });
    }
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Error updating boost plan:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete boost plan
export const deleteBoostPlan: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    
    await db.collection("boost_plans").deleteOne({ _id: new ObjectId(id) });
    res.json({ success: true, message: "Plan deleted" });
  } catch (error: any) {
    console.error("Error deleting boost plan:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Apply boost to property
export const applyBoost: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const { propertyId, boostPlanId } = req.body;

    const plan = await db.collection("boost_plans").findOne({ _id: new ObjectId(boostPlanId) });
    if (!plan) {
      return res.status(404).json({ success: false, error: "Boost plan not found" });
    }

    const boostStartTime = new Date();
    const boostEndTime = new Date(boostStartTime.getTime() + plan.duration * 60 * 60 * 1000);

    await db.collection("properties").updateOne(
      { _id: new ObjectId(propertyId) },
      {
        $set: {
          boosted: true,
          boostPlanId: boostPlanId,
          boostStartTime,
          boostEndTime,
          boostApprovalStatus: "approved",
          updatedAt: new Date(),
        },
      }
    );

    res.json({ success: true, message: "Boost applied successfully", data: { boostEndTime } });
  } catch (error: any) {
    console.error("Error applying boost:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get boosted properties (for featured section)
export const getBoostedProperties: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const now = new Date();

    const properties = await db
      .collection("properties")
      .find({
        boosted: true,
        boostEndTime: { $gt: now },
        approvalStatus: "approved",
        status: "active",
        isDeleted: { $ne: true },
      })
      .sort({ boostStartTime: -1 })
      .limit(20)
      .toArray();

    res.json({ success: true, data: properties });
  } catch (error: any) {
    console.error("Error fetching boosted properties:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Apply featured to property (auto-approve if property already admin-approved)
export const applyFeatured: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const { propertyId, packageId } = req.body;
    const userId = (req as any).user?.userId || (req as any).user?.id;

    if (!propertyId || !packageId) {
      return res.status(400).json({ success: false, error: "Property ID and Package ID are required" });
    }

    // Find the package
    const pkg = await db.collection("ad_packages").findOne({ _id: new ObjectId(packageId) });
    if (!pkg) {
      return res.status(404).json({ success: false, error: "Featured plan not found" });
    }

    // Check if property exists and belongs to user
    const property = await db.collection("properties").findOne({ _id: new ObjectId(propertyId) });
    if (!property) {
      return res.status(404).json({ success: false, error: "Property not found" });
    }

    // Calculate featured end date based on package duration
    const featuredStartDate = new Date();
    const featuredEndDate = new Date(featuredStartDate.getTime() + pkg.duration * 24 * 60 * 60 * 1000);

    // Check if property is already admin-approved
    const isAutoApproved = property.approvalStatus === "approved";

    if (isAutoApproved) {
      // Auto-approve: Property already admin-approved, directly make it featured
      await db.collection("properties").updateOne(
        { _id: new ObjectId(propertyId) },
        {
          $set: {
            featured: true, // Directly set to true since property is already approved
            featuredPending: false,
            featuredPackageId: packageId,
            featuredPackageName: pkg.name,
            featuredStartDate,
            featuredEndDate,
            featuredApprovedAt: new Date(),
            updatedAt: new Date(),
          },
        }
      );

      // Create a featured request record (auto-approved)
      await db.collection("featured_requests").insertOne({
        propertyId: new ObjectId(propertyId),
        userId: userId ? new ObjectId(userId) : null,
        packageId: new ObjectId(packageId),
        packageName: pkg.name,
        packagePrice: pkg.price,
        duration: pkg.duration,
        status: "approved", // Auto-approved
        autoApproved: true,
        approvedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      res.json({ 
        success: true, 
        autoApproved: true,
        message: "Featured applied! Your property is now in Featured Properties section.",
        data: { featuredEndDate }
      });
    } else {
      // Pending approval: Property not yet admin-approved
      await db.collection("properties").updateOne(
        { _id: new ObjectId(propertyId) },
        {
          $set: {
            featured: false, // Will be set to true after admin approval
            featuredPending: true,
            featuredPackageId: packageId,
            featuredPackageName: pkg.name,
            featuredStartDate,
            featuredEndDate,
            featuredRequestedAt: new Date(),
            updatedAt: new Date(),
          },
        }
      );

      // Create a featured request record for admin review
      await db.collection("featured_requests").insertOne({
        propertyId: new ObjectId(propertyId),
        userId: userId ? new ObjectId(userId) : null,
        packageId: new ObjectId(packageId),
        packageName: pkg.name,
        packagePrice: pkg.price,
        duration: pkg.duration,
        status: "pending",
        autoApproved: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      res.json({ 
        success: true, 
        autoApproved: false,
        message: "Featured request submitted! Admin will review and approve your property.",
        data: { featuredEndDate }
      });
    }
  } catch (error: any) {
    console.error("Error applying featured:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get featured properties (admin approved) - for homepage display
export const getApprovedFeaturedProperties: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const now = new Date();

    const properties = await db
      .collection("properties")
      .find({
        featured: true,
        featuredEndDate: { $gt: now },
        approvalStatus: "approved",
        status: "active",
        isDeleted: { $ne: true },
      })
      .sort({ featuredStartDate: -1 })
      .limit(20)
      .toArray();

    res.json({ success: true, data: properties });
  } catch (error: any) {
    console.error("Error fetching featured properties:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};
