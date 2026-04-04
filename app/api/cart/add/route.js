import connectDB from "@/config/db";
import { STORE_EVENT_TYPES, recordStoreEvent } from "@/lib/storeEvents";
import Cart from "@/models/Cart";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  sanitizeEnum,
  sanitizeIdentifier,
  sanitizeNumber,
  sanitizePlainText,
} from "@/lib/security/input";

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
    sanitized.price = sanitizeNumber(item.price, { min: 0, fallback: 0 });
  }

  const quantity = sanitizeNumber(item.quantity, {
    min: 1,
    max: 100,
    fallback: 0,
  });
  if (quantity <= 0) {
    return null;
  }
  sanitized.quantity = quantity;
  sanitized.format = sanitizeEnum(item.format, ["physical", "digital"], "");
  sanitized.dimensions = sanitizePlainText(item.dimensions, { maxLength: 32 });
  sanitized.title = sanitizePlainText(item.title, { maxLength: 160 });
  sanitized.slug = sanitizePlainText(item.slug, { maxLength: 180 });
  sanitized.imageUrl = sanitizePlainText(item.imageUrl, { maxLength: 500 });
  sanitized.productId = sanitizeIdentifier(item.productId || item._id, {
    maxLength: 64,
  });

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
    const guestId = sanitizeIdentifier(bodyGuestId ?? headerGuestId ?? null, {
      maxLength: 128,
    });

    if (!userId && !guestId) {
      return NextResponse.json(
        { success: false, message: "Missing cart identifier" },
        { status: 400 }
      );
    }

    const sanitizedItemKey = sanitizePlainText(itemKey, { maxLength: 160 });

    if (!sanitizedItemKey) {
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

    const previousItem = cart.items?.[sanitizedItemKey]
      ? JSON.parse(JSON.stringify(cart.items[sanitizedItemKey]))
      : null;

    cart.items[sanitizedItemKey] = sanitizedItem;
    cart.markModified("items");
    await cart.save();

    try {
      if (!previousItem) {
        await recordStoreEvent({
          eventType: STORE_EVENT_TYPES.CART_ADDED,
          productId: sanitizedItem.productId || sanitizedItem._id || itemKey,
          userId,
          guestId,
          format: sanitizedItem.format,
          dimensions: sanitizedItem.dimensions,
          quantity: sanitizedItem.quantity,
          unitPrice: sanitizedItem.price,
          lineTotal: Number(sanitizedItem.price || 0) * sanitizedItem.quantity,
          source: "cart_api",
          metadata: {
            itemKey: sanitizedItemKey,
            title: sanitizedItem.title,
          },
        });
      } else if (
        Number(previousItem.quantity) !== Number(sanitizedItem.quantity)
      ) {
        await recordStoreEvent({
          eventType: STORE_EVENT_TYPES.CART_QUANTITY_UPDATED,
          productId: sanitizedItem.productId || sanitizedItem._id || itemKey,
          userId,
          guestId,
          format: sanitizedItem.format,
          dimensions: sanitizedItem.dimensions,
          quantity: sanitizedItem.quantity,
          unitPrice: sanitizedItem.price,
          lineTotal: Number(sanitizedItem.price || 0) * sanitizedItem.quantity,
          source: "cart_api",
          metadata: {
            itemKey: sanitizedItemKey,
            title: sanitizedItem.title,
            previousQuantity: Number(previousItem.quantity || 0),
            nextQuantity: Number(sanitizedItem.quantity || 0),
          },
        });
      }
    } catch (trackingError) {
      console.error("[cart-add] Failed to record store event", trackingError);
    }

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
