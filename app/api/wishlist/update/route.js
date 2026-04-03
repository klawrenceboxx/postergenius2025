import connectDB from "@/config/db";
import { STORE_EVENT_TYPES, recordStoreEvents } from "@/lib/storeEvents";
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

    const { wishlistData = [] } = await request.json();
    await connectDB();

    const user = await User.findOne({ userId });
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    const previousWishlist = Array.isArray(user.wishlist) ? user.wishlist : [];
    const previousIds = new Set(
      previousWishlist.map((item) => String(item?.productId || item))
    );
    const nextIds = new Set(
      wishlistData.map((item) => String(item?.productId || item))
    );

    user.wishlist = wishlistData;
    await user.save();

    const events = [];

    for (const productId of nextIds) {
      if (!previousIds.has(productId)) {
        events.push({
          eventType: STORE_EVENT_TYPES.WISHLIST_ADDED,
          productId,
          userId,
          source: "wishlist_api",
        });
      }
    }

    for (const productId of previousIds) {
      if (!nextIds.has(productId)) {
        events.push({
          eventType: STORE_EVENT_TYPES.WISHLIST_REMOVED,
          productId,
          userId,
          source: "wishlist_api",
        });
      }
    }

    if (events.length) {
      try {
        await recordStoreEvents(events);
      } catch (trackingError) {
        console.error("[wishlist-update] Failed to record store events", trackingError);
      }
    }

    return NextResponse.json({
      success: true,
      wishlist: user.wishlist,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
