import { NextResponse } from "next/server";
import connectDB from "@/config/db";
import WebhookFailure from "@/models/WebhookFailure";
import { verifyWebhookSignature } from "@/lib/printful";
import { processPrintfulWebhook } from "@/lib/printful-webhook-processor";

export const runtime = "nodejs";

async function recordWebhookFailure({ eventType, rawBody, error }) {
  try {
    await connectDB();
    await WebhookFailure.create({
      eventType,
      rawBody,
      errorMessage: error?.message || String(error),
    });
  } catch (loggingError) {
    console.error("[Printful] Failed to record webhook failure", loggingError);
  }
}

export async function POST(request) {
  const signature = request.headers.get("x-printful-signature");
  const rawBody = await request.text();

  try {
    if (!verifyWebhookSignature(rawBody, signature)) {
      const error = new Error("Invalid webhook signature");
      await recordWebhookFailure({
        eventType: "invalid_signature",
        rawBody,
        error,
      });
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 401 }
      );
    }

    const result = await processPrintfulWebhook(rawBody);

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("[Printful] Webhook processing failed:", error);
    await recordWebhookFailure({
      eventType: "processing_error",
      rawBody,
      error,
    });
    const status = error.status || 500;
    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      { status }
    );
  }
}
