import { NextResponse } from "next/server";
import connectDB from "@/config/db";
import Promo from "@/models/PromoModel";

const sanitizeNumber = (value) => {
  if (value === "" || value === null || value === undefined) return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
};

const serializePromo = (promo) => ({
  ...promo,
  _id: promo._id?.toString?.() ?? promo._id,
});

export async function GET() {
  try {
    await connectDB();

    const promos = await Promo.find({})
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      promos: promos.map(serializePromo),
    });
  } catch (error) {
    console.error("Promo List Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load promos" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const payload = await request.json();
    const normalizedCode = payload.code?.trim()?.toUpperCase();

    const promoData = {
      code: normalizedCode,
      type: payload.type,
      appliesTo: payload.appliesTo ?? "all",
      condition: payload.condition ?? "none",
      value: sanitizeNumber(payload.value) ?? 0,
      minCartValue: sanitizeNumber(payload.minCartValue),
      minQuantity: sanitizeNumber(payload.minQuantity),
      expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : undefined,
      isActive:
        typeof payload.isActive === "boolean" ? payload.isActive : true,
      showInBanner:
        typeof payload.showInBanner === "boolean" ? payload.showInBanner : false,
    };

    if (!promoData.code || !promoData.type || promoData.value < 0) {
      return NextResponse.json(
        { success: false, message: "Invalid promo payload" },
        { status: 400 }
      );
    }

    if (promoData.showInBanner) {
      await Promo.updateMany(
        { showInBanner: true },
        { $set: { showInBanner: false } }
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

export async function PATCH(request) {
  try {
    await connectDB();
    const payload = await request.json();

    if (!payload?.id || !payload?.action) {
      return NextResponse.json(
        { success: false, message: "Promo id and action are required" },
        { status: 400 }
      );
    }

    const promo = await Promo.findById(payload.id);
    if (!promo) {
      return NextResponse.json(
        { success: false, message: "Promo not found" },
        { status: 404 }
      );
    }

    if (payload.action === "reactivate") {
      promo.isActive = true;
      promo.expiresAt = null;

      if (promo.showInBanner) {
        await Promo.updateMany(
          { _id: { $ne: promo._id }, showInBanner: true },
          { $set: { showInBanner: false } }
        );
      }
    } else {
      return NextResponse.json(
        { success: false, message: "Unsupported action" },
        { status: 400 }
      );
    }

    await promo.save();

    return NextResponse.json({
      success: true,
      promo: serializePromo(promo.toObject()),
    });
  } catch (error) {
    console.error("Promo Update Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update promo" },
      { status: 500 }
    );
  }
}
