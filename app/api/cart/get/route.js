import connectDB from "@/config/db";
import Cart from "@/models/Cart";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

function extractGuestId(request) {
  const headerGuestId = request.headers.get("x-guest-id");
  if (headerGuestId) return headerGuestId;
  return request.nextUrl.searchParams.get("guestId");
}

export async function GET(request) {
  try {
    const { userId } = getAuth(request);
    const guestId = extractGuestId(request);

    if (guestId && typeof guestId !== "string") {
      return NextResponse.json(
        { success: false, message: "Invalid guestId" },
        { status: 400 }
      );
    }

    if (!userId && !guestId) {
      return NextResponse.json({ success: true, cartItems: {} });
    }

    await connectDB();
    const query = userId ? { userId } : { guestId };
    const cart = await Cart.findOne(query);

    return NextResponse.json({
      success: true,
      cartItems: cart?.items || {},
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

/**
 * Manual verification:
 * 1. Create a cart document tied to either a userId or guestId in MongoDB.
 * 2. For authenticated requests, call `/api/cart/get` with a valid Clerk session.
 * 3. For guests, send `x-guest-id` header (or `?guestId=`) and confirm the stored items are returned.
 */
