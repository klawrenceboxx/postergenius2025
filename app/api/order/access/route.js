import { NextResponse } from "next/server";
import connectDB from "@/config/db";
import Order from "@/models/Order";
import {
  createOrderLookupToken,
  matchesOrderLookupNumber,
} from "@/lib/orderAccess";
import {
  sanitizeEmail,
  sanitizePlainText,
} from "@/lib/security/input";

const GENERIC_LOOKUP_ERROR =
  "We couldn't verify that order. Please check your details and try again.";

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function POST(request) {
  try {
    const body = await request.json();
    const email = sanitizeEmail(body?.email);
    const orderNumber = sanitizePlainText(body?.orderNumber, {
      maxLength: 64,
    });

    if (!email || !orderNumber) {
      return NextResponse.json(
        { success: false, message: "Email and order number are required." },
        { status: 400 }
      );
    }

    await connectDB();

    const emailRegex = new RegExp(`^${escapeRegex(email)}$`, "i");
    const candidateOrders = await Order.find({
      $or: [
        { customerEmail: emailRegex },
        { "shippingAddressSnapshot.email": emailRegex },
      ],
    })
      .sort({ date: -1, createdAt: -1 })
      .select("_id customerEmail shippingAddressSnapshot.email")
      .limit(25);

    const matchingOrder = candidateOrders.find((order) =>
      matchesOrderLookupNumber(order._id, orderNumber)
    );

    if (!matchingOrder) {
      return NextResponse.json(
        { success: false, message: GENERIC_LOOKUP_ERROR },
        { status: 404 }
      );
    }

    const { token, tokenHash, expiresAt } = createOrderLookupToken();

    await Order.updateOne(
      { _id: matchingOrder._id },
      {
        $set: {
          guestLookupTokenHash: tokenHash,
          guestLookupTokenExpiresAt: expiresAt,
        },
      }
    );

    return NextResponse.json({
      success: true,
      token,
      orderId: matchingOrder._id.toString(),
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("[order/access] Failed to issue order access token", error);
    return NextResponse.json(
      { success: false, message: "Unable to process order lookup right now." },
      { status: 500 }
    );
  }
}

