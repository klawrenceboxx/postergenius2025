import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { recordProductViewOnce } from "@/lib/storeEvents";
import { sanitizeIdentifier, sanitizePlainText } from "@/lib/security/input";

export async function POST(request) {
  try {
    const { userId } = getAuth(request);
    const body = await request.json();
    const guestId = sanitizeIdentifier(
      body?.guestId ||
        request.headers.get("x-guest-id") ||
        request.headers.get("x-session-id") ||
        null,
      { maxLength: 128 }
    );
    const productId = sanitizeIdentifier(body?.productId, { maxLength: 64 });

    if (!productId) {
      return NextResponse.json(
        { success: false, message: "productId is required" },
        { status: 400 }
      );
    }

    const result = await recordProductViewOnce({
      productId,
      userId,
      guestId,
      source: "product_page",
      metadata: {
        path: sanitizePlainText(body.path, { maxLength: 240 }) || null,
      },
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
