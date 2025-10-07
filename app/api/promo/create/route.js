import { NextResponse } from "next/server";
import connectDB from "@/config/db";
import Promo from "@/models/PromoModel";

const sanitizeNumber = (value) => {
  if (value === "" || value === null || value === undefined) return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
};

export async function POST(request) {
  try {
    await connectDB();
    const payload = await request.json();

    const promoData = {
      code: payload.code?.trim(),
      type: payload.type,
      condition: payload.condition ?? "none",
      value: sanitizeNumber(payload.value) ?? 0,
      minCartValue: sanitizeNumber(payload.minCartValue),
      minQuantity: sanitizeNumber(payload.minQuantity),
      expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : undefined,
      isActive:
        typeof payload.isActive === "boolean" ? payload.isActive : true,
    };

    if (!promoData.code || !promoData.type || promoData.value < 0) {
      return NextResponse.json(
        { success: false, message: "Invalid promo payload" },
        { status: 400 }
      );
    }

    const promo = await Promo.create(promoData);
    return NextResponse.json({ success: true, promo });
  } catch (error) {
    console.error("Promo Create Error:", error);

    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, message: "Promo code already exists" },
        { status: 409 }
      );
    }

    if (error.name === "ValidationError") {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to create promo" },
      { status: 500 }
    );
  }
}
