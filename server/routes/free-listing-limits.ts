import { RequestHandler } from "express";
import { getDatabase } from "../db/mongodb";
import { ObjectId } from "mongodb";

// Get all users with their listing counts and limits
export const getUsersWithListingStats: RequestHandler = async (req, res) => {
  console.log("✅ getUsersWithListingStats API called");
  try {
    const db = getDatabase();
    const { page = "1", limit = "20", search = "" } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const filter: any = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    // Get users (sellers and agents only)
    const users = await db
      .collection("users")
      .find({ ...filter, userType: { $in: ["seller", "agent"] } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .toArray();

    // Get listing counts for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const userId = user._id?.toString();

        // Get total active listings
        const totalListings = await db.collection("properties").countDocuments({
          ownerId: userId,
          status: "active",
          approvalStatus: "approved",
          isDeleted: { $ne: true },
        });

        // Get free listings in current period
        const freeListingLimit = user.freeListingLimit || {
          limit: 5,
          period: "monthly",
          limitType: 30,
        };

        const periodStart = new Date(
          Date.now() - freeListingLimit.limitType * 24 * 60 * 60 * 1000,
        );

        const freeListingsInPeriod = await db
          .collection("properties")
          .countDocuments({
            ownerId: userId,
            createdAt: { $gte: periodStart },
            $or: [
              { packageId: { $exists: false } },
              { packageId: null },
              { isPaid: false },
            ],
          });

        return {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          userType: user.userType,
          totalListings,
          freeListingsInPeriod,
          freeListingLimit,
          createdAt: user.createdAt,
        };
      }),
    );

    const total = await db
      .collection("users")
      .countDocuments({ ...filter, userType: { $in: ["seller", "agent"] } });

    res.json({
      success: true,
      data: usersWithStats,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("Error fetching users with listing stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch users with listing stats",
    });
  }
};

// Update free listing limit for a user
export const updateUserFreeListingLimit: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const { userId } = req.params;
    const { limit, period } = req.body;

    if (
      !userId ||
      typeof limit !== "number" ||
      !["monthly", "yearly"].includes(period)
    ) {
      return res.status(400).json({
        success: false,
        error:
          "Invalid parameters: userId, limit (number), and period (monthly/yearly) are required",
      });
    }

    const limitType = period === "monthly" ? 30 : 365;

    const result = await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          freeListingLimit: {
            limit,
            period,
            limitType,
          },
          updatedAt: new Date(),
        },
      },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    res.json({
      success: true,
      message: "Free listing limit updated successfully",
    });
  } catch (error) {
    console.error("Error updating free listing limit:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update free listing limit",
    });
  }
};

// Get admin settings for default free listing limits
export const getAdminFreeListingSettings: RequestHandler = async (req, res) => {
  console.log("✅ getAdminFreeListingSettings API called");
  try {
    const db = getDatabase();

    const settings = await db
      .collection("adminSettings")
      .findOne({ _id: "freeListingLimits" });

    if (!settings) {
      return res.json({
        success: true,
        data: {
          defaultLimit: 5,
          defaultPeriod: "monthly",
          defaultLimitType: 30,
        },
      });
    }

    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error("Error fetching admin settings:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch admin settings",
    });
  }
};

// Update admin settings for default free listing limits
export const updateAdminFreeListingSettings: RequestHandler = async (
  req,
  res,
) => {
  try {
    const db = getDatabase();
    const { limit, period } = req.body;

    if (typeof limit !== "number" || !["monthly", "yearly"].includes(period)) {
      return res.status(400).json({
        success: false,
        error:
          "Invalid parameters: limit (number) and period (monthly/yearly) are required",
      });
    }

    const limitType = period === "monthly" ? 30 : 365;

    await db.collection("adminSettings").updateOne(
      { _id: "freeListingLimits" },
      {
        $set: {
          defaultLimit: limit,
          defaultPeriod: period,
          defaultLimitType: limitType,
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    );

    res.json({
      success: true,
      message: "Admin settings updated successfully",
    });
  } catch (error) {
    console.error("Error updating admin settings:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update admin settings",
    });
  }
};

// Get single user listing stats
export const getUserListingStats: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const { userId } = req.params;

    const user = await db
      .collection("users")
      .findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    const freeListingLimit = user.freeListingLimit || {
      limit: 5,
      period: "monthly",
      limitType: 30,
    };

    const periodStart = new Date(
      Date.now() - freeListingLimit.limitType * 24 * 60 * 60 * 1000,
    );

    const freeListingsInPeriod = await db
      .collection("properties")
      .countDocuments({
        ownerId: userId,
        createdAt: { $gte: periodStart },
        $or: [
          { packageId: { $exists: false } },
          { packageId: null },
          { isPaid: false },
        ],
      });

    const totalListings = await db.collection("properties").countDocuments({
      ownerId: userId,
      status: "active",
      approvalStatus: "approved",
      isDeleted: { $ne: true },
    });

    res.json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        userType: user.userType,
        totalListings,
        freeListingsInPeriod,
        freeListingLimit,
        remainingFreeListings: Math.max(
          0,
          freeListingLimit.limit - freeListingsInPeriod,
        ),
      },
    });
  } catch (error) {
    console.error("Error fetching user listing stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch user listing stats",
    });
  }
};

// Get current user listing stats (for sellers to see their own stats)
export const getCurrentUserListingStats: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
    }

    const user = await db
      .collection("users")
      .findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    const freeListingLimit = user.freeListingLimit || {
      limit: 5,
      period: "monthly",
      limitType: 30,
    };

    const periodStart = new Date(
      Date.now() - freeListingLimit.limitType * 24 * 60 * 60 * 1000,
    );

    const freeListingsInPeriod = await db
      .collection("properties")
      .countDocuments({
        ownerId: userId,
        createdAt: { $gte: periodStart },
        $or: [
          { packageId: { $exists: false } },
          { packageId: null },
          { isPaid: false },
        ],
      });

    // Get pending free listings in period
    const pendingFreeListings = await db
      .collection("properties")
      .countDocuments({
        ownerId: userId,
        createdAt: { $gte: periodStart },
        approvalStatus: "pending",
        $or: [
          { packageId: { $exists: false } },
          { packageId: null },
          { isPaid: false },
        ],
      });

    const totalListings = await db.collection("properties").countDocuments({
      ownerId: userId,
      status: "active",
      approvalStatus: "approved",
      isDeleted: { $ne: true },
    });

    res.json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        userType: user.userType,
        totalListings,
        freeListingsInPeriod,
        pendingFreeListings,
        freeListingLimit,
        remainingFreeListings: Math.max(
          0,
          freeListingLimit.limit - freeListingsInPeriod,
        ),
      },
    });
  } catch (error) {
    console.error("Error fetching current user listing stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch user listing stats",
    });
  }
};
