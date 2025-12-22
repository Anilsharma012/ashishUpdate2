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
      { upsert: true }
    );

    await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      {
        $addToSet: { fcmTokens: token },
        $set: { lastFcmTokenUpdate: new Date() },
      }
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

    await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      { $pull: { fcmTokens: token } as any }
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
