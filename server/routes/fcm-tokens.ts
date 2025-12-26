import { RequestHandler } from "express";
import { getDatabase } from "../db/mongodb";
import { ObjectId } from "mongodb";

export const saveFcmToken: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const userId = (req as any).userId;
    const { token, deviceInfo } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: "FCM token is required",
      });
    }

    await db.collection("fcm_tokens").updateOne(
      { userId: new ObjectId(userId), token },
      {
        $set: {
          userId: new ObjectId(userId),
          token,
          deviceInfo: deviceInfo || {},
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true },
    );

    await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      {
        $addToSet: { fcmTokens: token },
        $set: { lastFcmTokenUpdate: new Date() },
      },
    );

    console.log(`📱 FCM token saved for user ${userId}`);

    res.json({
      success: true,
      message: "FCM token saved successfully",
    });
  } catch (error) {
    console.error("Error saving FCM token:", error);
    res.status(500).json({
      success: false,
      error: "Failed to save FCM token",
    });
  }
};

export const removeFcmToken: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const userId = (req as any).userId;
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: "FCM token is required",
      });
    }

    await db.collection("fcm_tokens").deleteOne({
      userId: new ObjectId(userId),
      token,
    });

    await db
      .collection("users")
      .updateOne(
        { _id: new ObjectId(userId) },
        { $pull: { fcmTokens: token } as any },
      );

    console.log(`📱 FCM token removed for user ${userId}`);

    res.json({
      success: true,
      message: "FCM token removed successfully",
    });
  } catch (error) {
    console.error("Error removing FCM token:", error);
    res.status(500).json({
      success: false,
      error: "Failed to remove FCM token",
    });
  }
};

/**
 * Debug endpoint - check FCM token status for a user
 * Admin only - used to diagnose notification delivery issues
 */
export const getFcmTokenStatus: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const { userId } = req.params;

    if (!userId || !ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        error: "Valid user ID is required",
      });
    }

    const userIdObj = new ObjectId(userId);
    const user = await db
      .collection("users")
      .findOne(
        { _id: userIdObj },
        {
          projection: {
            name: 1,
            email: 1,
            fcmTokens: 1,
            lastFcmTokenUpdate: 1,
          },
        },
      );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    const tokens = await db
      .collection("fcm_tokens")
      .find({ userId: userIdObj })
      .toArray();

    res.json({
      success: true,
      data: {
        userId: userId,
        userName: user.name || "Unknown",
        email: user.email,
        fcmTokensCount: (user.fcmTokens || []).length,
        fcmTokens: (user.fcmTokens || []).map((t) => ({
          token: t.substring(0, 20) + "...", // Masked for security
          fullToken: t, // Store full token for verification
        })),
        tokenDetails: tokens.map((t) => ({
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
          deviceInfo: t.deviceInfo || {},
        })),
        lastUpdated: user.lastFcmTokenUpdate || "Never",
        status: (user.fcmTokens || []).length > 0 ? "✅ Ready" : "⚠️ No tokens",
      },
    });
  } catch (error) {
    console.error("Error fetching FCM token status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch FCM token status",
    });
  }
};
