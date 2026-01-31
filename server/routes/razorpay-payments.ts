import { Router, type RequestHandler } from "express";
import { getDatabase } from "../db/mongodb";
import type { ApiResponse } from "@shared/types";
import { ObjectId } from "mongodb";
import Razorpay from "razorpay";
import crypto from "crypto";
import "dotenv/config";
import { sendPushNotificationToUser } from "../utils/fcm-push";
import { sendPaymentSuccessEmail } from "../utils/mailer";

/** ✅ ESM/CJS safe Razorpay constructor (no delete/remove, only added) */
const RazorpayCtor: any = (Razorpay as any)?.default || (Razorpay as any);

/** ---------- Config ---------- */
interface RazorpayConfig {
  enabled: boolean;
  keyId: string;
  keySecret: string;
  webhookSecret?: string;
}

const getRazorpayConfig = (): RazorpayConfig | null => {
  const keyId = (process.env.RAZORPAY_KEY_ID || "").trim();
  const keySecret = (process.env.RAZORPAY_KEY_SECRET || "").trim();
  const webhookSecret = (process.env.RAZORPAY_WEBHOOK_SECRET || "").trim();

  console.log("🔑 RZP cfg:", {
    hasKeyId: !!keyId,
    hasKeySecret: !!keySecret,
    prefix: keyId.slice(0, 8) + "...",
    NODE_ENV: process.env.NODE_ENV,
  });

  if (!keyId || !keySecret) return null;

  // Allow test keys for now (user can switch to live keys later)
  if (keyId.startsWith("rzp_test")) {
    console.log("⚠️ Using Razorpay TEST mode");
  }

  return {
    enabled: true,
    keyId,
    keySecret,
    webhookSecret: webhookSecret || undefined,
  };
};

/** ---------- Helpers ---------- */
const bad = (res: any, msg: string, code = 400) =>
  res.status(code).json({ success: false, error: msg });

const rupeesToPaise = (amt: number) => Math.round(Number(amt) * 100);

/** =====================================================================
 *  POST /api/payments/razorpay/create
 *  Body: { packageId: string; propertyId?: string; paymentDetails?: { amount?: number; ... } }
 *  Returns: { transactionId, razorpayOrderId, amount (paise), currency, keyId }
 * ===================================================================== */
export const createRazorpayOrder: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const cfg = getRazorpayConfig();
    if (!cfg) return bad(res, "Razorpay is not configured");

    // auth (expects upstream middleware to have set req.userId)
    const userIdRaw = (req as any).userId as string | undefined;
    if (!userIdRaw) return bad(res, "Please login to continue", 401);

    let userObjId: ObjectId;
    try {
      userObjId = new ObjectId(userIdRaw);
    } catch {
      return bad(res, "Invalid user id", 401);
    }

    const { packageId, propertyId, paymentDetails } = (req.body || {}) as {
      packageId: string;
      propertyId?: string;
      paymentDetails?: { amount?: number; [k: string]: any };
    };
    if (!packageId) return bad(res, "Missing packageId");

    let pkgObjId: ObjectId;
    try {
      pkgObjId = new ObjectId(packageId);
    } catch {
      return bad(res, "Invalid package ID");
    }

    const pkg = await db.collection("ad_packages").findOne({ _id: pkgObjId });
    if (!pkg) return bad(res, "Package not found", 404);

    // Prefer package price; allow explicit override for testing if > 0
    const amountRupees =
      Number(pkg.price || 0) > 0
        ? Number(pkg.price)
        : Number(paymentDetails?.amount || 0);

    if (!amountRupees || amountRupees <= 0) {
      return bad(res, "Invalid package amount");
    }

    const amountPaise = rupeesToPaise(amountRupees);

    // Optional propertyId
    let propObjId: ObjectId | undefined;
    if (propertyId) {
      try {
        propObjId = new ObjectId(propertyId);
      } catch {
        return bad(res, "Invalid propertyId");
      }
    }

    // Razorpay instance (✅ updated to safe constructor)
    const rzp = new RazorpayCtor({
      key_id: cfg.keyId,
      key_secret: cfg.keySecret,
    });

    // Create order
    const order = (await rzp.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: `rcpt_${pkgObjId.toString().slice(-8)}_${Date.now()}`,
      // ✅ IMPORTANT: use 1 instead of true to avoid API rejection
      payment_capture: 1,
      notes: {
        packageId: pkgObjId.toString(),
        propertyId: propObjId?.toString() || "none",
        userId: userObjId.toString(),
        packageName: String(pkg.name || ""),
      },
    })) as any;

    const orderId = order.id as string;

    // Persist transaction (store rupees for readability)
    const now = new Date();
    const txDoc = {
      userId: userObjId,
      packageId: pkgObjId,
      propertyId: propObjId,
      amount: amountRupees,
      currency: "INR",
      paymentMethod: "razorpay",
      paymentDetails: paymentDetails || {},
      razorpayOrderId: orderId,
      status: "pending",
      packageName: String(pkg.name || ""),
      packageDuration: Number(pkg.duration || 0),
      createdAt: now,
      updatedAt: now,
    };

    const insertRes = await db.collection("transactions").insertOne(txDoc);

    const response: ApiResponse<{
      transactionId: string;
      razorpayOrderId: string;
      amount: number; // paise
      currency: string;
      keyId: string;
    }> = {
      success: true,
      data: {
        transactionId: insertRes.insertedId.toString(),
        razorpayOrderId: orderId,
        amount: amountPaise,
        currency: "INR",
        keyId: cfg.keyId,
      },
    };

    return res.json(response);
  } catch (err: any) {
    // ✅ Better debug (no remove, only improved)
    console.error("❌ Error creating Razorpay order:", {
      message: err?.message,
      statusCode: err?.statusCode,
      error: err?.error,
      description: err?.error?.description,
    });

    return res.status(500).json({
      success: false,
      error:
        err?.error?.description ||
        err?.message ||
        "Failed to create Razorpay order",
    });
  }
};

/** =====================================================================
 *  POST /api/payments/razorpay/verify
 *  Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 *  Verifies signature, marks tx paid, and (critically) sets property to PENDING APPROVAL.
 * ===================================================================== */
export const verifyRazorpayPayment: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const cfg = getRazorpayConfig();
    if (!cfg) return bad(res, "Razorpay not configured");

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      (req.body || {}) as {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      };

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return bad(res, "Missing required payment details");
    }

    // Signature verify
    const expected = crypto
      .createHmac("sha256", cfg.keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expected !== razorpay_signature) {
      return bad(res, "Payment verification failed - Invalid signature");
    }

    const tx = await db.collection("transactions").findOne({
      razorpayOrderId: razorpay_order_id,
    });
    if (!tx) return bad(res, "Transaction not found", 404);

    const now = new Date();

    // 1) Mark transaction paid
    await db.collection("transactions").updateOne(
      { _id: tx._id },
      {
        $set: {
          status: "paid",
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          paidAt: now,
          updatedAt: now,
        },
      },
    );

    // 2) If property/package present → attach package snapshot & mark as PENDING APPROVAL (not live)
    let propertyTitle = "";
    let propertyId = "";
    if (tx.propertyId && tx.packageId) {
      const pkg = await db.collection("ad_packages").findOne({
        _id: new ObjectId(String(tx.packageId)),
      });

      const property = await db.collection("properties").findOne({
        _id: new ObjectId(String(tx.propertyId)),
      });
      propertyTitle = property?.title || "Your Property";
      propertyId = String(tx.propertyId);

      if (pkg) {
        const packageExpiry = new Date();
        packageExpiry.setDate(
          packageExpiry.getDate() + Number(pkg.duration || 0),
        );

        await db.collection("properties").updateOne(
          { _id: new ObjectId(String(tx.propertyId)) },
          {
            $set: {
              // payment meta
              isPaid: true,
              paymentStatus: "paid",
              paymentGateway: "razorpay",
              lastPaymentAt: now,

              // paid amount (for admin dashboard display)
              paidAmount: Number(tx.amount || 0),
              paidCurrency: String(tx.currency || "INR"),
              razorpayPaymentId: razorpay_payment_id,
              razorpayOrderId: razorpay_order_id,

              // package meta (snapshot)
              packageId: new ObjectId(String(tx.packageId)),
              package: {
                id: new ObjectId(String(pkg._id)),
                name: String(pkg.name || ""),
                type: String(pkg.type || ""),
                price: Number(pkg.price || 0),
                duration: Number(pkg.duration || 0),
                features: Array.isArray(pkg.features) ? pkg.features : [],
                purchasedAt: now,
                expiry: packageExpiry,
              },
              packageExpiry,

              // visibility / moderation
              // After successful payment, property goes to PENDING status - awaits admin approval
              status: "pending",
              approvalStatus: "pending",
              isApproved: false,

              // UX extras
              featured: pkg.type === "featured" || pkg.type === "premium",
              updatedAt: now,
            },
            $unset: {
              // ensure any accidental live flags are removed
              liveAt: "",
              approvedAt: "",
            },
          },
        );
      }
    }

    // 3) Get user info and send notifications
    const user = await db.collection("users").findOne({ _id: tx.userId });
    const userName = user?.name || "User";
    const userEmail = user?.email;

    // Create in-app notification for user
    await db.collection("user_notifications").insertOne({
      userId: tx.userId,
      title: "Payment Successful!",
      message: `Your payment of ₹${tx.amount} for "${propertyTitle}" was successful. Your property is now waiting for admin approval.`,
      type: "payment_success",
      delivered: true,
      read: false,
      deliveredAt: now,
      createdAt: now,
      metadata: {
        transactionId: String(tx._id),
        propertyId: propertyId,
        amount: tx.amount,
        paymentId: razorpay_payment_id,
      },
    });

    // Send FCM push notification
    try {
      await sendPushNotificationToUser(
        String(tx.userId),
        "Payment Successful!",
        `Your payment of ₹${tx.amount} was successful. Property is waiting for admin approval.`,
        {
          type: "payment_success",
          propertyId: propertyId,
          transactionId: String(tx._id),
        },
      );
      console.log("✅ Push notification sent for payment success");
    } catch (pushErr) {
      console.warn("⚠️ Failed to send push notification:", pushErr);
    }

    // Send email notification
    if (userEmail) {
      try {
        await sendPaymentSuccessEmail(
          userEmail,
          userName,
          propertyTitle,
          Number(tx.amount || 0),
          razorpay_payment_id,
          String(tx.packageName || "Package"),
        );
        console.log("✅ Payment success email sent to:", userEmail);
      } catch (emailErr) {
        console.warn("⚠️ Failed to send payment email:", emailErr);
      }
    }

    const response: ApiResponse<{ message: string; transactionId: string }> = {
      success: true,
      data: {
        message:
          "Payment verified successfully! Your property is now waiting for admin approval.",
        transactionId: String(tx._id),
      },
    };
    return res.json(response);
  } catch (err: any) {
    console.error("❌ Error verifying Razorpay payment:", err?.message || err);
    return res
      .status(500)
      .json({ success: false, error: "Failed to verify payment" });
  }
};

/** =====================================================================
 *  GET /api/payments/razorpay/status/:orderId
 *  Returns latest tx status for given Razorpay order id
 * ===================================================================== */
export const getRazorpayPaymentStatus: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const { orderId } = req.params as { orderId: string };

    if (!orderId) return bad(res, "orderId required");

    const tx = await db.collection("transactions").findOne({
      razorpayOrderId: orderId,
    });

    if (!tx) return bad(res, "Transaction not found", 404);

    const response: ApiResponse<{ status: string; transactionId: string }> = {
      success: true,
      data: {
        status: String(tx.status),
        transactionId: String(tx._id),
      },
    };
    return res.json(response);
  } catch (err: any) {
    console.error("❌ Error getting payment status:", err?.message || err);
    return res
      .status(500)
      .json({ success: false, error: "Failed to get payment status" });
  }
};

/** =====================================================================
 *  POST /api/payments/razorpay/boost/create
 *  Body: { boostPlanId: string; propertyId: string }
 *  Creates Razorpay order for boost plan purchase
 * ===================================================================== */
export const createBoostOrder: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const cfg = getRazorpayConfig();
    if (!cfg) return bad(res, "Razorpay is not configured");

    const userIdRaw = (req as any).userId as string | undefined;
    if (!userIdRaw) return bad(res, "Please login to continue", 401);

    let userObjId: ObjectId;
    try {
      userObjId = new ObjectId(userIdRaw);
    } catch {
      return bad(res, "Invalid user id", 401);
    }

    const { boostPlanId, propertyId } = req.body as { boostPlanId: string; propertyId: string };
    if (!boostPlanId || !propertyId) return bad(res, "Missing boostPlanId or propertyId");

    let boostPlanObjId: ObjectId;
    let propertyObjId: ObjectId;
    try {
      boostPlanObjId = new ObjectId(boostPlanId);
      propertyObjId = new ObjectId(propertyId);
    } catch {
      return bad(res, "Invalid boost plan or property ID");
    }

    const boostPlan = await db.collection("boost_plans").findOne({ _id: boostPlanObjId });
    if (!boostPlan) return bad(res, "Boost plan not found", 404);

    const property = await db.collection("properties").findOne({ _id: propertyObjId });
    if (!property) return bad(res, "Property not found", 404);

    const amountRupees = Number(boostPlan.price || 0);
    if (!amountRupees || amountRupees <= 0) return bad(res, "Invalid boost plan price");

    const razorpay = new RazorpayCtor({ key_id: cfg.keyId, key_secret: cfg.keySecret });
    
    const amountPaise = rupeesToPaise(amountRupees);
    console.log("📦 Creating boost order:", { amountRupees, amountPaise, keyId: cfg.keyId.slice(0, 12) + "..." });
    
    const rzpOrder = await razorpay.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: `boost_${Date.now()}`,
    });
    
    console.log("✅ Boost order created:", { orderId: rzpOrder.id, amount: rzpOrder.amount });

    const tx = {
      type: "boost",
      userId: userObjId,
      propertyId: propertyObjId,
      boostPlanId: boostPlanObjId,
      amount: amountRupees,
      currency: "INR",
      status: "pending",
      razorpayOrderId: rzpOrder.id,
      createdAt: new Date(),
    };
    const insertResult = await db.collection("transactions").insertOne(tx);

    return res.json({
      success: true,
      data: {
        transactionId: String(insertResult.insertedId),
        razorpayOrderId: rzpOrder.id,
        amount: rupeesToPaise(amountRupees),
        currency: "INR",
        keyId: cfg.keyId,
      },
    });
  } catch (err: any) {
    console.error("❌ Error creating boost order:", err?.message || err);
    return res.status(500).json({ success: false, error: "Failed to create boost order" });
  }
};

/** =====================================================================
 *  POST /api/payments/razorpay/boost/verify
 *  Verify boost payment and apply boost to property
 * ===================================================================== */
export const verifyBoostPayment: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const cfg = getRazorpayConfig();
    if (!cfg) return bad(res, "Razorpay is not configured");

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, transactionId } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !transactionId) {
      return bad(res, "Missing payment verification data");
    }

    const generated = crypto
      .createHmac("sha256", cfg.keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generated !== razorpay_signature) {
      return bad(res, "Invalid payment signature", 400);
    }

    let txObjId: ObjectId;
    try {
      txObjId = new ObjectId(transactionId);
    } catch {
      return bad(res, "Invalid transaction ID");
    }

    const tx = await db.collection("transactions").findOne({ _id: txObjId });
    if (!tx) return bad(res, "Transaction not found", 404);

    // Update transaction status
    await db.collection("transactions").updateOne(
      { _id: txObjId },
      {
        $set: {
          status: "paid",
          razorpayPaymentId: razorpay_payment_id,
          paidAt: new Date(),
        },
      }
    );

    // Get boost plan duration
    const boostPlan = await db.collection("boost_plans").findOne({ _id: tx.boostPlanId });
    const durationHours = boostPlan?.duration || 24;

    // Apply boost to property
    const boostEndTime = new Date(Date.now() + durationHours * 60 * 60 * 1000);
    await db.collection("properties").updateOne(
      { _id: tx.propertyId },
      {
        $set: {
          boosted: true,
          boostPlanId: tx.boostPlanId,
          boostStartTime: new Date(),
          boostEndTime: boostEndTime,
        },
      }
    );

    return res.json({ success: true, message: "Boost applied successfully" });
  } catch (err: any) {
    console.error("❌ Error verifying boost payment:", err?.message || err);
    return res.status(500).json({ success: false, error: "Failed to verify boost payment" });
  }
};

/** =====================================================================
 *  POST /api/payments/razorpay/featured/create
 *  Body: { packageId: string; propertyId: string }
 *  Creates Razorpay order for featured plan purchase
 * ===================================================================== */
export const createFeaturedOrder: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const cfg = getRazorpayConfig();
    if (!cfg) return bad(res, "Razorpay is not configured");

    const userIdRaw = (req as any).userId as string | undefined;
    if (!userIdRaw) return bad(res, "Please login to continue", 401);

    let userObjId: ObjectId;
    try {
      userObjId = new ObjectId(userIdRaw);
    } catch {
      return bad(res, "Invalid user id", 401);
    }

    const { packageId, propertyId } = req.body as { packageId: string; propertyId: string };
    if (!packageId || !propertyId) return bad(res, "Missing packageId or propertyId");

    let packageObjId: ObjectId;
    let propertyObjId: ObjectId;
    try {
      packageObjId = new ObjectId(packageId);
      propertyObjId = new ObjectId(propertyId);
    } catch {
      return bad(res, "Invalid package or property ID");
    }

    const pkg = await db.collection("ad_packages").findOne({ _id: packageObjId });
    if (!pkg) return bad(res, "Package not found", 404);

    const property = await db.collection("properties").findOne({ _id: propertyObjId });
    if (!property) return bad(res, "Property not found", 404);

    const amountRupees = Number(pkg.price || 0);
    if (!amountRupees || amountRupees <= 0) return bad(res, "Invalid package price");

    const razorpay = new RazorpayCtor({ key_id: cfg.keyId, key_secret: cfg.keySecret });
    const rzpOrder = await razorpay.orders.create({
      amount: rupeesToPaise(amountRupees),
      currency: "INR",
      receipt: `featured_${Date.now()}`,
    });

    const tx = {
      type: "featured",
      userId: userObjId,
      propertyId: propertyObjId,
      packageId: packageObjId,
      amount: amountRupees,
      currency: "INR",
      status: "pending",
      razorpayOrderId: rzpOrder.id,
      createdAt: new Date(),
    };
    const insertResult = await db.collection("transactions").insertOne(tx);

    return res.json({
      success: true,
      data: {
        transactionId: String(insertResult.insertedId),
        razorpayOrderId: rzpOrder.id,
        amount: rupeesToPaise(amountRupees),
        currency: "INR",
        keyId: cfg.keyId,
      },
    });
  } catch (err: any) {
    console.error("❌ Error creating featured order:", err?.message || err);
    return res.status(500).json({ success: false, error: "Failed to create featured order" });
  }
};

/** =====================================================================
 *  POST /api/payments/razorpay/featured/verify
 *  Verify featured payment and apply featured to property
 * ===================================================================== */
export const verifyFeaturedPayment: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const cfg = getRazorpayConfig();
    if (!cfg) return bad(res, "Razorpay is not configured");

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, transactionId } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !transactionId) {
      return bad(res, "Missing payment verification data");
    }

    const generated = crypto
      .createHmac("sha256", cfg.keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generated !== razorpay_signature) {
      return bad(res, "Invalid payment signature", 400);
    }

    let txObjId: ObjectId;
    try {
      txObjId = new ObjectId(transactionId);
    } catch {
      return bad(res, "Invalid transaction ID");
    }

    const tx = await db.collection("transactions").findOne({ _id: txObjId });
    if (!tx) return bad(res, "Transaction not found", 404);

    // Update transaction status
    await db.collection("transactions").updateOne(
      { _id: txObjId },
      {
        $set: {
          status: "paid",
          razorpayPaymentId: razorpay_payment_id,
          paidAt: new Date(),
        },
      }
    );

    // Check if property is already admin-approved
    const property = await db.collection("properties").findOne({ _id: tx.propertyId });
    const isAutoApproved = property?.approvalStatus === "approved";

    // Apply featured to property
    await db.collection("properties").updateOne(
      { _id: tx.propertyId },
      {
        $set: {
          featured: isAutoApproved, // Auto-approve if already admin-approved
          featuredPackageId: tx.packageId,
          featuredPurchaseDate: new Date(),
          featuredPending: !isAutoApproved, // Mark as pending if not yet approved
        },
      }
    );

    return res.json({
      success: true,
      message: isAutoApproved ? "Featured applied successfully" : "Featured request submitted for approval",
      autoApproved: isAutoApproved,
    });
  } catch (err: any) {
    console.error("❌ Error verifying featured payment:", err?.message || err);
    return res.status(500).json({ success: false, error: "Failed to verify featured payment" });
  }
};

/** ---------- Router (default export) ----------
 *   POST /api/payments/razorpay/create
 *   POST /api/payments/razorpay/verify
 *   GET  /api/payments/razorpay/status/:orderId
 *   POST /api/payments/razorpay/boost/create
 *   POST /api/payments/razorpay/boost/verify
 *   POST /api/payments/razorpay/featured/create
 *   POST /api/payments/razorpay/featured/verify
 */
export const razorpayRouter = Router();
razorpayRouter.post("/create", createRazorpayOrder);
razorpayRouter.post("/verify", verifyRazorpayPayment);
razorpayRouter.get("/status/:orderId", getRazorpayPaymentStatus);
razorpayRouter.post("/boost/create", createBoostOrder);
razorpayRouter.post("/boost/verify", verifyBoostPayment);
razorpayRouter.post("/featured/create", createFeaturedOrder);
razorpayRouter.post("/featured/verify", verifyFeaturedPayment);

export default razorpayRouter;
