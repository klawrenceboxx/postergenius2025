import connectDB from "@/config/db";
import Cart from "@/models/Cart";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const ALLOWED_STRING_FIELDS = [
  "_id",
  "productId",
  "title",
  "imageUrl",
  "slug",
  "dimensions",
  "format",
];

function sanitizeCartItem(item = {}) {
  if (!item || typeof item !== "object") {
    return null;
  }

  const sanitized = {};

  for (const field of ALLOWED_STRING_FIELDS) {
    if (item[field] !== undefined && item[field] !== null) {
      sanitized[field] = String(item[field]);
    }
  }

  if (item.price !== undefined) {
    const price = Number(item.price);
    sanitized.price = Number.isFinite(price) ? price : 0;
  }

  const quantity = Number(item.quantity ?? 0);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return null;
  }
  sanitized.quantity = quantity;

  return sanitized;
}

function buildIdentifier(userId, guestId) {
  if (userId) return { userId };
  if (guestId) return { guestId };
  return null;
}

export async function POST(request) {
  try {
    const { userId } = getAuth(request);
    const body = await request.json();
    const { guestId: bodyGuestId, itemKey, itemData } = body || {};

    const headerGuestId = request.headers.get("x-guest-id");
    const guestId = bodyGuestId ?? headerGuestId ?? null;

    if (guestId && typeof guestId !== "string") {
      return NextResponse.json(
        { success: false, message: "Invalid guestId" },
        { status: 400 }
      );
    }

    if (!userId && !guestId) {
      return NextResponse.json(
        { success: false, message: "Missing cart identifier" },
        { status: 400 }
      );
    }

    if (!itemKey || typeof itemKey !== "string") {
      return NextResponse.json(
        { success: false, message: "Invalid cart item key" },
        { status: 400 }
      );
    }

    const sanitizedItem = sanitizeCartItem(itemData);
    if (!sanitizedItem) {
      return NextResponse.json(
        { success: false, message: "Invalid cart item payload" },
        { status: 400 }
      );
    }

    await connectDB();

    const query = buildIdentifier(userId, guestId);
    let cart = await Cart.findOne(query);
    if (!cart) {
      cart = await Cart.create({ ...query, items: {} });
    }

    cart.items[itemKey] = sanitizedItem;
    cart.markModified("items");
    await cart.save();

    return NextResponse.json({ success: true, cartItems: cart.items });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

/**
 * Manual verification:
 * 1. For signed-in users, send a POST request to `/api/cart/add` with `{ itemKey, itemData }`.
 * 2. For guests, include `guestId` in the JSON body (and/or `x-guest-id` header) and repeat step 1.
 * 3. Inspect MongoDB to ensure the `items` object is updated with sanitized data only.
 */
