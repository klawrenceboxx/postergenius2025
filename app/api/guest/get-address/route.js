import connectDB from "@/config/db";
import GuestAddress from "@/models/GuestAddress";
import { NextResponse } from "next/server";

function extractGuestId(request) {
  const headerGuestId = request.headers.get("x-guest-id");
  if (headerGuestId) return headerGuestId;
  return request.nextUrl.searchParams.get("guestId");
}

export async function GET(request) {
  try {
    const guestId = extractGuestId(request);

    if (!guestId) {
      return NextResponse.json({ success: true, address: null });
    }

    if (typeof guestId !== "string") {
      return NextResponse.json(
        { success: false, message: "Invalid guestId" },
        { status: 400 }
      );
    }

    await connectDB();

    const address = await GuestAddress.findOne({ guestId });

    return NextResponse.json({ success: true, address });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

/**
 * Manual verification:
 * 1. Create a guest address document in MongoDB tied to a guestId.
 * 2. Send a GET request to `/api/guest/get-address` with either the `x-guest-id`
 *    header or `?guestId=` query param and confirm the address is returned.
 * 3. Request without a guestId and confirm `{ address: null }` is returned.
 */
