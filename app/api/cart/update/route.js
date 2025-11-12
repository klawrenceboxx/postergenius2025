import connectDB from "@/config/db";
import User from "@/models/User";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const expectedSecret = process.env.INTERNAL_API_SECRET;
    const providedSecret = request.headers.get("x-internal-secret");
    const body = (await request.json()) || {};
    const { cartData = {}, userId: bodyUserId } = body;

    const isInternalRequest = Boolean(
      expectedSecret &&
      providedSecret &&
      providedSecret === expectedSecret
    );

    const auth = isInternalRequest ? null : getAuth(request);
    const userId = isInternalRequest ? bodyUserId : auth?.userId;

    if (!userId) {
      const message = isInternalRequest
        ? "Missing userId for internal cart update"
        : "Unauthorized";
      return NextResponse.json(
        { success: false, message },
        { status: isInternalRequest ? 400 : 401 }
      );
    }

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
        const { quantity = 1, format, dimensions, ...rest } = value;
        payload[key] = { quantity, format, dimensions, ...rest };
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
