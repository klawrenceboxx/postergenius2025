import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import connectDB from "@/config/db";
import Order from "@/models/Order";
import { sanitizeIdentifier } from "@/lib/security/input";

export async function POST(request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const guestId = sanitizeIdentifier(body?.guestId, { maxLength: 128 });
    const clerkUser = await currentUser();
    const emailSet = new Set(
      (clerkUser?.emailAddresses || [])
        .map((entry) => String(entry?.emailAddress || "").trim().toLowerCase())
        .filter(Boolean)
    );

    await connectDB();

    const matchers = [{ userId: { $exists: false } }, { userId: null }];
    const ownershipClauses = [];

    if (guestId) {
      ownershipClauses.push({ guestId });
    }

    if (emailSet.size > 0) {
      const emailRegexMatchers = Array.from(emailSet).map(
        (email) => new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i")
      );
      ownershipClauses.push(
        { customerEmail: { $in: emailRegexMatchers } },
        { "shippingAddressSnapshot.email": { $in: emailRegexMatchers } }
      );
    }

    if (ownershipClauses.length === 0) {
      return NextResponse.json({ success: true, linkedCount: 0 });
    }

    const result = await Order.updateMany(
      {
        $and: [{ $or: matchers }, { $or: ownershipClauses }],
      },
      {
        $set: { userId },
        $unset: { guestId: "" },
      }
    );

    return NextResponse.json({
      success: true,
      linkedCount: result.modifiedCount || 0,
    });
  } catch (error) {
    console.error("[order/claim-guest] Failed to claim guest orders", error);
    return NextResponse.json(
      { success: false, message: "Unable to link guest orders right now." },
      { status: 500 }
    );
  }
}
