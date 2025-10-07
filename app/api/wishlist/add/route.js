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

    let wishlist = await Wishlist.findOne({ user: user._id });

    if (!wishlist) {
      wishlist = await Wishlist.create({ user: user._id, items: [] });
    }

    const alreadyExists = wishlist.items.some(
      (item) => item.product?.toString() === productId
    );

    if (!alreadyExists) {
      wishlist.items.push({ product: productId });
      await wishlist.save();
    }

    await wishlist.populate({
      path: "items.product",
      select: "title imageUrl price",
    });

    return NextResponse.json({
      success: true,
      message: alreadyExists
        ? "Product already in wishlist"
        : "Product added to wishlist",
      wishlist,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
