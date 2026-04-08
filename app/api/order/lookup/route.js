import { NextResponse } from "next/server";
import connectDB from "@/config/db";
import Order from "@/models/Order";
import "@/models/Product";
import { sanitizeIdentifier } from "@/lib/security/input";

function normalizeTokens(input) {
  const source = Array.isArray(input) ? input : [input];
  return [...new Set(source.map((value) => sanitizeIdentifier(value, { maxLength: 128 })).filter(Boolean))];
}

export async function POST(request) {
  try {
    const body = await request.json();
    const tokens = normalizeTokens(body?.tokens || body?.token);

    if (tokens.length === 0) {
      return NextResponse.json({ success: true, orders: [] });
    }

    await connectDB();

    const orders = await Order.find({ guestAccessToken: { $in: tokens } })
      .sort({ date: -1 })
      .populate("items.product")
      .populate("address")
      .lean();

    return NextResponse.json({ success: true, orders });
  } catch (error) {
    console.error("[order/lookup] Failed to fetch guest orders", error);
    return NextResponse.json(
      { success: false, message: error.message || "Unable to fetch guest orders" },
      { status: 500 }
    );
  }
}
