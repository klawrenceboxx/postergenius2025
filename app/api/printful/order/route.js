import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import connectDB from "@/config/db";
import Address from "@/models/Address";
import Product from "@/models/Product";
import { computePricing } from "@/lib/pricing";
import {
  formatRecipientFromAddress,
  assertVariantId,
  normalizeDimensions,
} from "@/lib/printful";

export const runtime = "nodejs";

function sanitizeQuantity(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 0;
  }
  return Math.floor(numeric);
}

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

async function buildPhysicalItems(items = []) {
  const physicalItems = [];

  for (const item of items) {
    const quantity = sanitizeQuantity(item?.quantity ?? 0);
    if (!quantity) continue;

    const format = String(item?.format || "physical").toLowerCase();
    if (format === "digital") continue;

    const productId = item?.productId || item?.product;
    if (!productId) {
      throw new Error(
        "Each item must include a productId when creating orders."
      );
    }

    const product = await Product.findById(productId).lean();
    if (!product) {
      throw new Error(
        `Unable to locate product ${productId} for Printful order.`
      );
    }

    const pricing = computePricing(product);
    const chosenDimensions =
      item?.dimensions || pricing.defaultPhysicalDimensions;
    const normalizedDimensions =
      normalizeDimensions(chosenDimensions) ||
      normalizeDimensions(pricing.defaultPhysicalDimensions);

    const variantId = assertVariantId(normalizedDimensions);

    const priceRecord =
      pricing.physicalPricing?.[chosenDimensions] ||
      pricing.physicalPricing?.[normalizedDimensions];
    const unitPrice = Number(
      priceRecord?.finalPrice ?? pricing.defaultPhysicalFinalPrice
    );

    physicalItems.push({
      variant_id: variantId,
      quantity,
      retail_price: unitPrice ? unitPrice.toFixed(2) : undefined,
    });
  }

  return physicalItems;
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

    if (!process.env.PRINTFUL_TOKEN) {
      console.error("[Printful] Missing PRINTFUL_TOKEN environment variable");
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
      items: physicalItems.map(({ variant_id, quantity, retail_price }) => {
        const entry = { variant_id, quantity };
        if (retail_price) {
          entry.retail_price = retail_price;
        }
        return entry;
      }),
    };

    if (externalId) {
      payload.external_id = externalId;
    }

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.PRINTFUL_TOKEN}`,
    };

    if (process.env.PRINTFUL_STORE_ID) {
      headers["X-PF-Store-Id"] = process.env.PRINTFUL_STORE_ID;
    }

    const response = await fetch("https://api.printful.com/orders", {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (response.ok && data?.result) {
      return NextResponse.json({ success: true, printfulOrder: data.result });
    }

    const message =
      data?.error?.message ||
      data?.error ||
      data?.result ||
      data?.message ||
      "Failed to create Printful order";

    console.error("[Printful] Order creation failed:", {
      status: response.status,
      statusText: response.statusText,
      body: data,
    });
    return NextResponse.json(
      { success: false, message },
      { status: response.status || 500 }
    );
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
