import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { recordProductViewOnce } from "@/lib/storeEvents";

export async function POST(request) {
  try {
    const { userId } = getAuth(request);
    const body = await request.json();
    const guestId =
      body?.guestId ||
      request.headers.get("x-guest-id") ||
      request.headers.get("x-session-id") ||
      null;

    if (!body?.productId) {
      return NextResponse.json(
        { success: false, message: "productId is required" },
        { status: 400 }
      );
    }

    const result = await recordProductViewOnce({
      productId: body.productId,
      userId,
      guestId,
      source: "product_page",
      metadata: {
        path: body.path || null,
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
