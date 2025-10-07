import connectDB from "@/config/db";
import Wishlist from "@/models/Wishlist";
import User from "@/models/User";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { productId } = await request.json();
    if (!productId) {
      return NextResponse.json(
        { success: false, message: "Product ID is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findOne({ userId });
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    const wishlist = await Wishlist.findOne({ user: user._id });
    if (!wishlist) {
      return NextResponse.json({
        success: true,
        message: "Wishlist is empty",
        wishlist: { user: user._id, items: [] },
      });
    }

    const initialLength = wishlist.items.length;
    wishlist.items = wishlist.items.filter(
      (item) => item.product?.toString() !== productId
    );

    if (wishlist.items.length !== initialLength) {
      await wishlist.save();
    }

    await wishlist.populate({
      path: "items.product",
      select: "title imageUrl price",
    });

    return NextResponse.json({
      success: true,
      message:
        wishlist.items.length === initialLength
          ? "Product not found in wishlist"
          : "Product removed from wishlist",
      wishlist,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
