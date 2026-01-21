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
