export const runtime = "nodejs";

import connectDB from "@/config/db";
import User from "@/models/User";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { userId } = getAuth(request);

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    let user = await User.findOne({ userId });
    // 🔹 If user isn't created yet, just return empty wishlist
    if (!user) {
      return NextResponse.json(
        { success: true, wishlist: [] },
        { status: 200 }
      );
    }

    const wishlist = user.wishlist || [];

    return NextResponse.json({ success: true, wishlist }, { status: 200 });
  } catch (error) {
    console.error("GET /api/wishlist/get error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
