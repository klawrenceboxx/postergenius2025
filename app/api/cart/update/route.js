import connectDB from "@/config/db";
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

    const { cartData = {} } = await request.json();
    await connectDB();

    // Clerk user id is stored on the User doc as `userId`
    const user = await User.findOne({ userId });
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    const payload = {};
    for (const [key, value] of Object.entries(cartData)) {
      if (value && typeof value === "object") {
        const { quantity = 1, format, dimensions, isDigital, ...rest } = value;
        payload[key] = {
          quantity,
          format,
          dimensions,
          ...(typeof isDigital !== "undefined" ? { isDigital } : {}),
          ...rest,
        };
      } else if (typeof value === "number") {
        payload[key] = value;
      }
    }

    user.cartItems = payload;
    await user.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
