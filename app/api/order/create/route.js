import connectDB from "@/config/db";
import Cart from "@/models/Cart";
import Order from "@/models/Order";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

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
      await Cart.findOneAndUpdate(
        cartIdentifier,
        { items: {} },
        { new: true }
      );
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
