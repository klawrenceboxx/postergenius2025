import connectDB from "@/config/db";
import { STORE_EVENT_TYPES, recordStoreEvent } from "@/lib/storeEvents";
import Cart from "@/models/Cart";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

function buildIdentifier(userId, guestId) {
  if (userId) return { userId };
  if (guestId) return { guestId };
  return null;
}

export async function POST(request) {
  try {
    const { userId } = getAuth(request);
    const body = await request.json();
    const { guestId: bodyGuestId, itemKey } = body || {};

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

    await connectDB();

    const query = buildIdentifier(userId, guestId);
    const cart = await Cart.findOne(query);

    if (!cart) {
      return NextResponse.json({ success: true, cartItems: {} });
    }

    if (cart.items && cart.items[itemKey]) {
      const removedItem = JSON.parse(JSON.stringify(cart.items[itemKey]));
      delete cart.items[itemKey];
      cart.markModified("items");
      await cart.save();

      try {
        await recordStoreEvent({
          eventType: STORE_EVENT_TYPES.CART_REMOVED,
          productId: removedItem.productId || removedItem._id || itemKey,
          userId,
          guestId,
          format: removedItem.format,
          dimensions: removedItem.dimensions,
          quantity: removedItem.quantity,
          unitPrice: removedItem.price,
          lineTotal:
            Number(removedItem.price || 0) * Number(removedItem.quantity || 1),
          source: "cart_api",
          metadata: {
            itemKey,
            title: removedItem.title,
          },
        });
      } catch (trackingError) {
        console.error("[cart-delete] Failed to record store event", trackingError);
      }
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
 * 1. Add a cart item (via `/api/cart/add`) for a user or guest.
 * 2. Call `/api/cart/delete` with the same identifier and `itemKey`.
 * 3. Confirm the response omits the removed entry and MongoDB reflects the deletion.
 */
