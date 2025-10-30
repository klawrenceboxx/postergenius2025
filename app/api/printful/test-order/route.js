import { NextResponse } from "next/server";
import connectDB from "@/config/db";
import Order from "@/models/Order";
import Product from "@/models/Product";
import { computePricing } from "@/lib/pricing";
import {
  formatRecipientFromAddress,
  assertVariantIdForProduct,
  normalizeDimensions,
} from "@/lib/printful";
import { ensureProductCdnUrl } from "@/lib/cdn";

function sanitizeQuantity(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 0;
  }
  return Math.floor(numeric);
}

function extractProductId(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    if (value._id) {
      return value._id.toString?.() || value._id;
    }
    if (value.id) {
      return value.id.toString?.() || value.id;
    }
  }
  return null;
}

function normalizeCartSnapshot(cartSnapshot) {
  if (!cartSnapshot) return [];

  if (Array.isArray(cartSnapshot)) {
    return cartSnapshot
      .map((entry) => {
        if (!entry) return null;
        const productId =
          extractProductId(entry.product) ||
          extractProductId(entry.productId);
        const quantity = sanitizeQuantity(entry.quantity);

        if (!productId || !quantity) return null;

        const normalized = { productId, quantity };
        if (entry.format) normalized.format = entry.format;
        if (entry.dimensions) normalized.dimensions = entry.dimensions;
        if (entry.printfulVariantId) {
          normalized.printfulVariantId = entry.printfulVariantId;
        }
        if (entry.name) normalized.name = entry.name;
        return normalized;
      })
      .filter(Boolean);
  }

  if (typeof cartSnapshot !== "object") {
    return [];
  }

  return Object.entries(cartSnapshot)
    .map(([key, entry]) => {
      if (!entry && entry !== 0) return null;
      const isObjectEntry = typeof entry === "object" && entry !== null;
      const productId = isObjectEntry
        ? extractProductId(entry.productId) || extractProductId(entry.product)
        : key.includes("-")
        ? key.split("-")[0]
        : key;

      const quantity = sanitizeQuantity(
        isObjectEntry ? entry.quantity ?? 0 : entry ?? 0
      );

      if (!productId || !quantity) {
        return null;
      }

      const normalized = { productId, quantity };

      if (isObjectEntry) {
        if (entry.format) normalized.format = entry.format;
        if (entry.dimensions) normalized.dimensions = entry.dimensions;
        if (entry.printfulVariantId) {
          normalized.printfulVariantId = entry.printfulVariantId;
        }
        if (entry.name) normalized.name = entry.name;
      } else {
        const [, format, dimensions] = key.split("-");
        if (format) normalized.format = format;
        if (dimensions) normalized.dimensions = dimensions;
      }

      return normalized;
    })
    .filter(Boolean);
}

function deriveOrderItems(orderDoc) {
  if (!orderDoc) return [];

  if (Array.isArray(orderDoc.items) && orderDoc.items.length > 0) {
    return orderDoc.items
      .map((item) => {
        if (!item) return null;
        const productId =
          extractProductId(item.product) || extractProductId(item.productId);
        const quantity = sanitizeQuantity(item.quantity);

        if (!productId || !quantity) return null;

        const normalized = {
          productId,
          quantity,
          format: item.format,
          dimensions: item.dimensions,
          printfulVariantId: item.printfulVariantId,
          name: item.name,
        };

        return normalized;
      })
      .filter(Boolean);
  }

  return normalizeCartSnapshot(orderDoc.cartSnapshot);
}

function coerceVariantId(value) {
  if (value === undefined || value === null) return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }
  return Math.floor(numeric);
}

async function buildPrintfulItems(items = []) {
  const physicalItems = [];

  for (const item of items) {
    const quantity = sanitizeQuantity(item?.quantity ?? 0);
    if (!quantity) continue;

    const format = String(item?.format || "physical").toLowerCase();
    if (format === "digital") continue;

    const productId = item?.productId || item?.product;
    if (!productId) {
      throw new Error("Order item is missing a product reference.");
    }

    const product = await Product.findById(productId).lean();
    if (!product) {
      throw new Error(
        `Unable to locate product ${productId} when building Printful order payload.`
      );
    }

    const cdnUrl = ensureProductCdnUrl(product);
    if (!cdnUrl) {
      console.warn(
        "⚠️ Missing cdnUrl for product when building Printful test order.",
        { productId: product._id }
      );
    }

    const pricing = computePricing(product);
    const chosenDimensions =
      item?.dimensions || pricing.defaultPhysicalDimensions;
    const normalizedDimensions =
      normalizeDimensions(chosenDimensions) ||
      normalizeDimensions(pricing.defaultPhysicalDimensions);

    const sizeForVariant =
      item?.dimensions || pricing.defaultPhysicalDimensions;

    let variantId = coerceVariantId(
      item?.printfulVariantId || item?.variantId || item?.variant_id
    );

    if (!variantId) {
      variantId = assertVariantIdForProduct(product, sizeForVariant);
    }

    const priceRecord =
      pricing.physicalPricing?.[chosenDimensions] ||
      pricing.physicalPricing?.[normalizedDimensions];
    const unitPrice = Number(
      priceRecord?.finalPrice ?? pricing.defaultPhysicalFinalPrice
    );

    const files = cdnUrl
      ? [
          {
            type: "default",
            url: cdnUrl,
          },
        ]
      : undefined;

    const entry = {
      variant_id: variantId,
      quantity,
      name: item?.name || product.name,
    };

    if (unitPrice > 0) {
      entry.retail_price = unitPrice.toFixed(2);
    }

    if (files) {
      entry.files = files;
    }

    physicalItems.push(entry);
  }

  return physicalItems;
}

export async function POST(request) {
  if (!process.env.PRINTFUL_API_KEY) {
    return NextResponse.json(
      { error: "PRINTFUL_API_KEY is not configured." },
      { status: 500 }
    );
  }

  await connectDB();

  let requestedOrderId = null;
  if (request?.bodyUsed !== true) {
    try {
      const payload = await request.json();
      if (payload && typeof payload.orderId === "string") {
        requestedOrderId = payload.orderId.trim();
      }
    } catch (error) {
      // Swallow JSON parsing errors – callers may legitimately send an empty body.
    }
  }

  let orderDoc = null;

  if (requestedOrderId) {
    orderDoc = await Order.findById(requestedOrderId).lean();
    if (!orderDoc) {
      return NextResponse.json(
        { error: `Order ${requestedOrderId} was not found.` },
        { status: 404 }
      );
    }
  } else {
    orderDoc = await Order.findOne({}, null, { sort: { createdAt: -1 } }).lean();
    if (!orderDoc) {
      return NextResponse.json(
        {
          error:
            "No orders are available to use as an external ID. Create an order and try again.",
        },
        { status: 404 }
      );
    }
  }

  const externalId = orderDoc._id.toString();

  const shippingAddress = orderDoc.shippingAddressSnapshot;
  if (!shippingAddress || typeof shippingAddress !== "object") {
    return NextResponse.json(
      {
        error:
          "The selected order does not include a shipping address snapshot.",
      },
      { status: 400 }
    );
  }

  let recipient;
  try {
    recipient = formatRecipientFromAddress(shippingAddress);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid address" },
      { status: 400 }
    );
  }

  const email =
    shippingAddress.email ||
    shippingAddress.contactEmail ||
    shippingAddress.userEmail;
  if (email) {
    const normalizedEmail = email.toString().trim();
    if (normalizedEmail) {
      recipient.email = normalizedEmail;
    }
  }

  const phone =
    shippingAddress.phone ||
    shippingAddress.phoneNumber ||
    shippingAddress.contactNumber;
  if (phone) {
    const normalizedPhone = phone.toString().trim();
    if (normalizedPhone) {
      recipient.phone = normalizedPhone;
    }
  }

  let items;
  try {
    const orderItems = deriveOrderItems(orderDoc);
    items = await buildPrintfulItems(orderItems);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to build Printful order payload.",
      },
      { status: 400 }
    );
  }

  if (!items || items.length === 0) {
    return NextResponse.json(
      {
        error:
          "The selected order does not include any physical items that can be sent to Printful.",
      },
      { status: 400 }
    );
  }

  const shippingService =
    typeof orderDoc.shippingService === "string" && orderDoc.shippingService.trim()
      ? orderDoc.shippingService.trim()
      : typeof orderDoc.shippingRateId === "string" &&
        orderDoc.shippingRateId.trim()
      ? orderDoc.shippingRateId.trim()
      : "STANDARD";

  const shippingCode = shippingService.toString().trim().toUpperCase() || "STANDARD";

  const orderData = {
    external_id: externalId,
    shipping: shippingCode,
    recipient,
    items,
  };

  try {
    const response = await fetch("https://api.printful.com/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
        ...(process.env.PRINTFUL_STORE_ID
          ? { "X-PF-Store-Id": process.env.PRINTFUL_STORE_ID }
          : {}),
      },
      body: JSON.stringify(orderData),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Printful 400 Response:", data); // 👈 add here
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
