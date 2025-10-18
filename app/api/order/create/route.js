import connectDB from "@/config/db";
import Cart from "@/models/Cart";
import Order from "@/models/Order";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  buildPhysicalItems,
  formatRecipientFromAddress,
  createPrintfulOrder,
} from "@/lib/printful";

function isNonEmptyObject(value) {
  return (
    value != null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length > 0
  );
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeCartItems(cartItems = {}) {
  return Object.entries(cartItems)
    .map(([key, entry]) => {
      const isObjectEntry = typeof entry === "object" && entry !== null;
      const productId = isObjectEntry
        ? entry.productId
        : key.includes("-")
        ? key.split("-")[0]
        : key;

      const quantity = Number(isObjectEntry ? entry.quantity ?? 0 : entry ?? 0);

      if (!productId || quantity <= 0) {
        return null;
      }

      const normalized = { productId, quantity };

      if (isObjectEntry) {
        if (entry.format) normalized.format = entry.format;
        if (entry.dimensions) normalized.dimensions = entry.dimensions;
      } else {
        const [, format, dimensions] = key.split("-");
        if (format) normalized.format = format;
        if (dimensions) normalized.dimensions = dimensions;
      }

      return normalized;
    })
    .filter(Boolean);
}

export async function POST(request) {
  try {
    const { userId } = getAuth(request);
    const body = await request.json();

    const {
      guestId: bodyGuestId,
      cartItems,
      shippingAddress,
      totalPrice,
      shippingPrice,
      taxPrice,
    } = body || {};

    const headerGuestId = request.headers.get("x-guest-id");
    const guestId = userId ? null : bodyGuestId ?? headerGuestId ?? null;

    if (!userId && (!guestId || typeof guestId !== "string")) {
      return NextResponse.json(
        { success: false, message: "guestId is required for guest checkout" },
        { status: 400 }
      );
    }

    if (!isNonEmptyObject(cartItems)) {
      return NextResponse.json(
        { success: false, message: "Cart items are required" },
        { status: 400 }
      );
    }

    if (!shippingAddress || typeof shippingAddress !== "object") {
      return NextResponse.json(
        { success: false, message: "Shipping address is required" },
        { status: 400 }
      );
    }

    const normalizedTotal = toNumber(totalPrice, NaN);
    if (!Number.isFinite(normalizedTotal)) {
      return NextResponse.json(
        { success: false, message: "Invalid total price" },
        { status: 400 }
      );
    }

    const normalizedShipping = toNumber(shippingPrice, 0);
    const normalizedTax = toNumber(taxPrice, 0);

    await connectDB();

    const normalizedItems = normalizeCartItems(cartItems);

    const order = await Order.create({
      userId: userId || undefined,
      guestId: userId ? undefined : guestId,
      cartSnapshot: cartItems,
      shippingAddressSnapshot: shippingAddress,
      totalPrice: Math.round(normalizedTotal * 100) / 100,
      shippingPrice: Math.round(normalizedShipping * 100) / 100,
      taxPrice: Math.round(normalizedTax * 100) / 100,
      status: "Order Placed",
    });

    const cartIdentifier = userId ? { userId } : { guestId };
    if (cartIdentifier) {
      await Cart.findOneAndUpdate(cartIdentifier, { items: {} }, { new: true });
    }

    const physicalItems = await buildPhysicalItems(normalizedItems);
    if (physicalItems.length) {
      const recipient = formatRecipientFromAddress(shippingAddress, {
        fallbackCountry: "CA",
      });
      try {
        const printfulOrder = await createPrintfulOrder({
          shipping: "STANDARD",
          recipient,
          items: physicalItems,
          external_id: order._id.toString(),
        });
        console.log("[Printful] Created order:", {
          localOrderId: order._id.toString(),
          printfulOrderId: printfulOrder?.id,
        });
      } catch (err) {
        console.error("[Printful] Failed to create order:", err);
      }
    }

    return NextResponse.json({
      success: true,
      orderId: order._id.toString(),
    });
  } catch (error) {
    console.error("❌ Error creating order:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
