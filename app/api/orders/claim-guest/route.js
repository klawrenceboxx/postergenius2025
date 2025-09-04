import connectDB from "@/config/db";
import Order from "@/models/Order";
import User from "@/models/User";
import Cart from "@/models/Cart";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySignedGuestId } from "@/lib/guestToken";
import { allow } from "@/lib/limiter";

export async function POST(request) {
  try {
    const { userId } = getAuth(request) || {};
    if (!userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    if (!allow(`claim:${userId}`)) {
      return NextResponse.json({ success: false, message: "Rate limited" }, { status: 429 });
    }

    const signed = cookies().get("gid")?.value || null;
    const guestId = verifySignedGuestId(signed);
    if (!guestId) {
      return NextResponse.json(
        { success: false, message: "Invalid guest session" },
        { status: 400 }
      );
    }

    await connectDB();

    // ensure user exists to maintain parity with cart merges
    let user = await User.findById(userId);
    if (!user) {
      user = await User.create({ _id: userId, cartItems: {} });
    }

    const cart = await Cart.findOne({ guestId });
    if (!cart || Date.now() - cart.updatedAt.getTime() > 30 * 24 * 60 * 60 * 1000) {
      return NextResponse.json(
        { success: false, message: "Stale guest session" },
        { status: 400 }
      );
    }

    const res = await Order.updateMany(
      { guestId },
      { $set: { userId }, $unset: { guestId: "" } }
    );

    console.info("[claim-guest]", {
      userId,
      guestId,
      matched: res.matchedCount,
      modified: res.modifiedCount,
    });

    return NextResponse.json({
      success: true,
      matched: res.matchedCount,
      modified: res.modifiedCount,
    });
  } catch (error) {
    console.error("[claim-guest] error:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
