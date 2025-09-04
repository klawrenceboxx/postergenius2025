import connectDB from "@/config/db";
import Cart from "@/models/Cart";
import User from "@/models/User";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySignedGuestId } from "@/lib/guestToken";
import { allow } from "@/lib/limiter";

export async function POST(request) {
  try {
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    if (!allow(`merge:${userId}`)) {
      return NextResponse.json({ success: false, message: "Rate limited" }, { status: 429 });
    }

    const signed = cookies().get("gid")?.value || null;
    const guestId = verifySignedGuestId(signed);
    if (!guestId) {
      return NextResponse.json({ success: true });
    }

    await connectDB();

    const guestCart = await Cart.findOne({ guestId });
    if (!guestCart) {
      return NextResponse.json({ success: true });
    }

    let user = await User.findOne({ userId });
    if (!user) {
      user = await User.create({ userId, cartItems: {} });
    }

    const merged = Object.create(null);
    Object.assign(merged, guestCart.items || {});
    for (const [p, q] of Object.entries(user.cartItems || {})) {
      merged[p] = (merged[p] || 0) + q;
    }

    user.cartItems = merged;
    await user.save();

    try {
      await Cart.deleteOne({ guestId });
    } catch (err) {
      console.error("[cart-merge] delete error", err);
    }

    console.info("[cart-merge]", { userId, guestId, items: Object.keys(merged).length });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[cart-merge] error:", error);
    return NextResponse.json({ success: false, message: error.message });
  }
}
