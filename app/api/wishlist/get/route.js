export const runtime = "nodejs";

import connectDB from "@/config/db";
import User from "@/models/User";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import mongoose from "mongoose";

export async function GET(request) {
  try {
    const { userId } = auth(request);
    console.log("USER ID FROM CLERK:", userId);

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    // after await connectDB();
    console.log("✅ CONNECTED TO DB:", mongoose.connection.name);
    console.log("✅ FULL URI:", process.env.MONGODB_URI);

    let user = await User.findOne({ userId });

    // ✅ AUTO-CREATE USER IF MISSING
    if (!user) {
      const clerkUser = await clerkClient.users.getUser(userId);

      user = await User.create({
        userId,
        name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim(),
        email: clerkUser.emailAddresses?.[0]?.emailAddress,
        imageUrl: clerkUser.imageUrl,
        wishlist: [],
        cart: [],
      });
    }

    return NextResponse.json({
      success: true,
      wishlist: user.wishlist || [],
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
