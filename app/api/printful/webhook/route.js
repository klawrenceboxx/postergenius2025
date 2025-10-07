// Printful does NOT provide a webhook secret or signature.
// Verification is done by checking the `store` ID in the payload.
import { NextResponse } from "next/server";
import connectDB from "@/config/db";
import WebhookFailure from "@/models/WebhookFailure";
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
  let rawBody = null;
  let body = null;

  try {
    rawBody = await request.text();
    body = rawBody ? JSON.parse(rawBody) : null;
  } catch (error) {
    console.error("[Printful] Failed to parse webhook body:", error);
    await recordWebhookFailure({
      eventType: "invalid_payload",
      rawBody,
      error,
    });
    return NextResponse.json({ error: "Webhook error" }, { status: 400 });
  }

  try {
    if (body?.store !== 16958262) {
      throw new Error("Unrecognized Printful store ID");
    }

    console.log("✅ Printful webhook received:", body?.type || "unknown");

    await processPrintfulWebhook(body);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Printful] Webhook processing failed:", error);
    await recordWebhookFailure({
      eventType: body?.type || "processing_error",
      rawBody,
      error,
    });
    return NextResponse.json({ error: "Webhook error" }, { status: 400 });
  }
}
