import { NextResponse } from "next/server";
import connectDB from "@/config/db";
import Promo from "@/models/PromoModel";
import { serializeBannerPromo } from "@/lib/promoBanner";

export async function GET() {
  try {
    await connectDB();

    const now = new Date();
    const promo = await Promo.findOne({
      isActive: true,
      showInBanner: true,
      $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gt: now } }],
    })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      promo: serializeBannerPromo(promo),
    });
  } catch (error) {
    console.error("Promo Banner Error:", error);
    return NextResponse.json(
      { success: false, promo: null, message: "Failed to load banner promo" },
      { status: 500 }
    );
  }
}
