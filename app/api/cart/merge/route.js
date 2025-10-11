import connectDB from "@/config/db";
import { mergeCartItems } from "@/lib/cartUtils";
import Cart from "@/models/Cart";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

async function extractGuestId(request) {
  const headerGuestId = request.headers.get("x-guest-id");
  if (headerGuestId) {
    return headerGuestId;
  }

  try {
    const body = await request.json();
    if (body && typeof body.guestId === "string") {
      return body.guestId;
    }
  } catch (error) {
    // Body might be empty or already consumed. Ignore.
  }

  return null;
}

export async function POST(request) {
  let guestId = null;
  try {
    const { userId } = getAuth(request);

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    guestId = await extractGuestId(request);

    if (!guestId) {
      console.log(
        `[cart-merge] No guestId provided for userId=${userId}. Skipping merge.`
      );
      return NextResponse.json({ success: true, merged: false });
    }

    await connectDB();

    const [userCart, guestCart] = await Promise.all([
      Cart.findOne({ userId }),
      Cart.findOne({ guestId }),
    ]);

    if (!guestCart) {
      console.log(
        `[cart-merge] guestId=${guestId} not found for userId=${userId}. Nothing to merge.`
      );
      return NextResponse.json({ success: true, merged: false });
    }

    const mergedItems = mergeCartItems(userCart?.items || {}, guestCart.items || {});

    if (!userCart) {
      await Cart.create({ userId, items: mergedItems });
    } else {
      userCart.items = mergedItems;
      await userCart.save();
    }

    await Cart.deleteOne({ guestId });

    console.log(
      `[cart-merge] guestId=${guestId} merged into userId=${userId}.`
    );

    return NextResponse.json({ success: true, merged: true });
  } catch (error) {
    console.error(
      `[cart-merge] Failed to merge guestId=${guestId || "unknown"}:`,
      error
    );
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
