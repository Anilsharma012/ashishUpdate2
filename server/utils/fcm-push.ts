import { getAdmin } from "../firebaseAdmin";
import { getDatabase } from "../db/mongodb";
import { ObjectId } from "mongodb";

interface PushNotificationResult {
  success: boolean;
  successCount: number;
  failureCount: number;
  errors: string[];
}

export async function sendPushNotificationToUser(
  userId: string | ObjectId,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<PushNotificationResult> {
  const result: PushNotificationResult = {
    success: false,
    successCount: 0,
    failureCount: 0,
    errors: [],
  };

  try {
    const db = getDatabase();
    const userIdObj = typeof userId === "string" ? new ObjectId(userId) : userId;

    const user = await db.collection("users").findOne(
      { _id: userIdObj },
      { projection: { fcmTokens: 1, name: 1 } }
    );

    if (!user || !user.fcmTokens || user.fcmTokens.length === 0) {
      result.errors.push(`No FCM tokens found for user ${userId}`);
      return result;
    }

    const admin = getAdmin();
    const tokens = user.fcmTokens as string[];

    console.log(`📱 Sending push to user ${user.name || userId} with ${tokens.length} token(s)`);

    for (const token of tokens) {
      try {
        await admin.messaging().send({
          token,
          notification: {
            title,
            body,
          },
          data: {
            url: "/notifications",
            ...(data ?? {}),
          },
          webpush: {
            notification: {
              icon: "/favicon.ico",
              badge: "/favicon.ico",
              vibrate: [100, 50, 100],
              requireInteraction: true,
            },
            fcmOptions: {
              link: data?.url || "/notifications",
            },
          },
          android: {
            priority: "high",
            notification: {
              channelId: "default",
              icon: "ic_notification",
              color: "#EF4444",
            },
          },
          apns: {
            payload: {
              aps: {
                sound: "default",
                badge: 1,
              },
            },
          },
        });
        result.successCount++;
        console.log(`✅ Push sent to token: ${token.substring(0, 20)}...`);
      } catch (tokenError: any) {
        result.failureCount++;
        const errorMsg = tokenError?.message || String(tokenError);
        result.errors.push(errorMsg);
        console.error(`❌ Push failed for token ${token.substring(0, 20)}...: ${errorMsg}`);

        if (
          tokenError?.code === "messaging/invalid-registration-token" ||
          tokenError?.code === "messaging/registration-token-not-registered"
        ) {
          await db.collection("users").updateOne(
            { _id: userIdObj },
            { $pull: { fcmTokens: token } as any }
          );
          await db.collection("fcm_tokens").deleteOne({ token });
          console.log(`🗑️ Removed invalid token: ${token.substring(0, 20)}...`);
        }
      }
    }

    result.success = result.successCount > 0;
    return result;
  } catch (error: any) {
    result.errors.push(error?.message || String(error));
    console.error("❌ sendPushNotificationToUser error:", error);
    return result;
  }
}

export async function sendPushNotificationToUsers(
  userIds: (string | ObjectId)[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<PushNotificationResult> {
  const aggregateResult: PushNotificationResult = {
    success: false,
    successCount: 0,
    failureCount: 0,
    errors: [],
  };

  console.log(`📱 Sending push notifications to ${userIds.length} users`);

  for (const userId of userIds) {
    const result = await sendPushNotificationToUser(userId, title, body, data);
    aggregateResult.successCount += result.successCount;
    aggregateResult.failureCount += result.failureCount;
    aggregateResult.errors.push(...result.errors);
  }

  aggregateResult.success = aggregateResult.successCount > 0;
  console.log(
    `📊 Push notification summary: ${aggregateResult.successCount} sent, ${aggregateResult.failureCount} failed`
  );

  return aggregateResult;
}

export async function sendPushToAllUsers(
  title: string,
  body: string,
  data?: Record<string, string>,
  userFilter?: Record<string, any>
): Promise<PushNotificationResult> {
  const aggregateResult: PushNotificationResult = {
    success: false,
    successCount: 0,
    failureCount: 0,
    errors: [],
  };

  try {
    const db = getDatabase();
    
    const filter = {
      ...userFilter,
      fcmTokens: { $exists: true, $ne: [] },
    };

    const users = await db
      .collection("users")
      .find(filter, { projection: { _id: 1, fcmTokens: 1, name: 1 } })
      .toArray();

    console.log(`📱 Found ${users.length} users with FCM tokens`);

    for (const user of users) {
      const result = await sendPushNotificationToUser(
        user._id,
        title,
        body,
        data
      );
      aggregateResult.successCount += result.successCount;
      aggregateResult.failureCount += result.failureCount;
    }

    aggregateResult.success = aggregateResult.successCount > 0;
    console.log(
      `📊 Broadcast push summary: ${aggregateResult.successCount} sent, ${aggregateResult.failureCount} failed`
    );

    return aggregateResult;
  } catch (error: any) {
    aggregateResult.errors.push(error?.message || String(error));
    console.error("❌ sendPushToAllUsers error:", error);
    return aggregateResult;
  }
}
