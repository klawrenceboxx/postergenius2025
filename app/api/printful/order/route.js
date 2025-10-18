import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import connectDB from "@/config/db";
import Address from "@/models/Address";
import {
  formatRecipientFromAddress,
  buildPhysicalItems,
  createPrintfulOrder,
} from "@/lib/printful";

// export const runtime = "nodejs";

async function resolveAddress(addressId, inlineAddress) {
  if (inlineAddress) {
    return inlineAddress;
  }
  if (!addressId) {
    return null;
  }
  const doc = await Address.findById(addressId).lean();
  return doc || null;
}

export async function POST(request) {
  try {
    const auth = getAuth(request);
    if (!auth.userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!process.env.PRINTFUL_API_KEY) {
      console.error("[Printful] Missing PRINTFUL_API_KEY environment variable");
      return NextResponse.json(
        { success: false, message: "Printful configuration missing" },
        { status: 500 }
      );
    }

    await connectDB();

    const body = await request.json();
    const {
      addressId,
      address: inlineAddress,
      items,
      shipping = "STANDARD",
      externalId,
    } = body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, message: "At least one item is required" },
        { status: 400 }
      );
    }

    const address = await resolveAddress(addressId, inlineAddress);
    if (!address) {
      return NextResponse.json(
        { success: false, message: "Shipping address not found" },
        { status: 400 }
      );
    }

    const recipient = formatRecipientFromAddress(address);
    const physicalItems = await buildPhysicalItems(items);

    if (physicalItems.length === 0) {
      return NextResponse.json(
        { success: false, message: "No physical items to submit" },
        { status: 400 }
      );
    }

    const payload = {
      shipping,
      recipient,
      items: physicalItems,
    };

    if (externalId) {
      payload.external_id = externalId;
    }

    const result = await createPrintfulOrder(payload);
    return NextResponse.json({ success: true, printfulOrder: result });
  } catch (error) {
    console.error("[Printful] Order creation error:", error);
    const status = error.status || 500;
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Unable to create Printful order",
      },
      { status }
    );
  }
}
