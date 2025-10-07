import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { getAuth } from "@clerk/nextjs/server";

import connectDB from "@/config/db";
import User from "@/models/User";
import Wishlist from "@/models/Wishlist";

export async function POST(request) {
  console.log("[wishlist/add] Incoming request");

  try {
    const { userId } = getAuth(request);
    console.log("[wishlist/add] userId from getAuth:", userId);

    const body = await request.json().catch((error) => {
      console.error("[wishlist/add] Failed to parse request body:", error);
      throw new Error("Invalid JSON body");
    });

    const productId = body?.productId;
    console.log("[wishlist/add] productId from body:", productId);

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!productId) {
      return NextResponse.json(
        { success: false, message: "Product ID is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findOne({ userId });
    console.log(
      "[wishlist/add] User.findOne result:",
      user ? { _id: user._id.toString(), userId: user.userId } : user
    );

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    let normalizedProductId;
    try {
      normalizedProductId = new mongoose.Types.ObjectId(productId);
    } catch (error) {
      console.error("[wishlist/add] Invalid productId ObjectId cast:", error);
      return NextResponse.json(
        { success: false, message: "Invalid product id" },
        { status: 400 }
      );
    }

    const existing = await Wishlist.findOne({
      user: user._id,
      product: normalizedProductId,
    });
    console.log(
      "[wishlist/add] Wishlist.findOne result:",
      existing
        ? {
            _id: existing._id.toString(),
            user: existing.user.toString(),
            product: existing.product.toString(),
          }
        : existing
    );

    if (existing) {
      return NextResponse.json({ success: true, wishlist: existing });
    }

    const wishlist = await Wishlist.create({
      user: user._id,
      userId: user.userId,
      product: normalizedProductId,
    });

    console.log("[wishlist/add] Created wishlist entry:", {
      _id: wishlist._id.toString(),
      user: wishlist.user.toString(),
      product: wishlist.product.toString(),
    });

    return NextResponse.json({ success: true, wishlist }, { status: 201 });
  } catch (error) {
    console.error("WISHLIST ADD ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to add to wishlist" },
      { status: 500 }
    );
  }
}
