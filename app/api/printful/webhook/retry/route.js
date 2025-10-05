import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import connectDB from "@/config/db";
import authAdmin from "@/lib/authAdmin";
import WebhookFailure from "@/models/WebhookFailure";
import { processPrintfulWebhook } from "@/lib/printful-webhook-processor";

export const runtime = "nodejs";

export async function POST(request) {
  const { userId } = getAuth(request);
  const isAdmin = await authAdmin(userId);

  if (!isAdmin) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  let payload = {};
  try {
    payload = await request.json();
  } catch (error) {
    payload = {};
  }

  const { limit = 10 } = payload;
  const retryLimit = Math.max(1, Math.min(Number(limit) || 10, 50));

  const failures = await WebhookFailure.find({})
    .sort({ createdAt: 1 })
    .limit(retryLimit)
    .lean();

  const results = [];

  for (const failure of failures) {
    try {
      const result = await processPrintfulWebhook(failure.rawBody);
      if (result?.status === "order_updated") {
        await WebhookFailure.deleteOne({ _id: failure._id });
      }
      results.push({
        failureId: failure._id.toString(),
        status: "processed",
        result,
      });
    } catch (error) {
      results.push({
        failureId: failure._id.toString(),
        status: "failed",
        error: error.message,
      });
    }
  }

  return NextResponse.json({ success: true, processed: results.length, results });
}
