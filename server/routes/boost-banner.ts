import { Router, Request, Response } from "express";
import { getDatabase } from "../db/mongodb";
import { authenticateToken, requireAdmin } from "../middleware/auth";

const router = Router();

const COLLECTION_NAME = "boost_banner_settings";

const defaultSettings = {
  enabled: true,
  title: "Boost Your Property",
  subtitle: "Get more visibility with our Boost Plans",
  backgroundColor: "#dc2626",
  textColor: "#ffffff",
  linkUrl: "/packages",
  linkText: "Boost Now",
  showBoostedCount: true,
};

router.get("/boost-banner-settings", async (req: Request, res: Response) => {
  try {
    const database = await getDatabase();
    const collection = database.collection(COLLECTION_NAME);
    const settings = await collection.findOne({});

    res.json({
      success: true,
      data: settings || defaultSettings,
    });
  } catch (error) {
    console.error("Error fetching boost banner settings:", error);
    res.json({
      success: true,
      data: defaultSettings,
    });
  }
});

router.get(
  "/admin/boost-banner-settings",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const database = await getDatabase();
      const collection = database.collection(COLLECTION_NAME);
      const settings = await collection.findOne({});

      res.json({
        success: true,
        data: settings || defaultSettings,
      });
    } catch (error) {
      console.error("Error fetching boost banner settings:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch boost banner settings",
      });
    }
  }
);

router.post(
  "/admin/boost-banner-settings",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const database = await getDatabase();
      const collection = database.collection(COLLECTION_NAME);

      const {
        enabled,
        title,
        subtitle,
        backgroundColor,
        textColor,
        linkUrl,
        linkText,
        showBoostedCount,
      } = req.body;

      const settings = {
        enabled: enabled !== undefined ? enabled : defaultSettings.enabled,
        title: title || defaultSettings.title,
        subtitle: subtitle || defaultSettings.subtitle,
        backgroundColor: backgroundColor || defaultSettings.backgroundColor,
        textColor: textColor || defaultSettings.textColor,
        linkUrl: linkUrl || defaultSettings.linkUrl,
        linkText: linkText || defaultSettings.linkText,
        showBoostedCount:
          showBoostedCount !== undefined
            ? showBoostedCount
            : defaultSettings.showBoostedCount,
        updatedAt: new Date(),
      };

      await collection.updateOne(
        {},
        { $set: settings },
        { upsert: true }
      );

      res.json({
        success: true,
        data: settings,
        message: "Boost banner settings saved successfully",
      });
    } catch (error) {
      console.error("Error saving boost banner settings:", error);
      res.status(500).json({
        success: false,
        error: "Failed to save boost banner settings",
      });
    }
  }
);

export default router;
