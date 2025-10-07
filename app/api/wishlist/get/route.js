import connectDB from "@/config/db";
import Wishlist from "@/models/Wishlist";
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

    const user = await User.findOne({ userId });
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    const wishlist = await Wishlist.findOne({ user: user._id })
      .populate({ path: "items.product", select: "title imageUrl price" })
      .lean();

    return NextResponse.json({
      success: true,
      wishlist: wishlist || { user: user._id, items: [] },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
