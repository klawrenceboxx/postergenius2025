import { NextResponse } from "next/server";
import connectDB from "@/config/db";
import Order from "@/models/Order";
import Address from "@/models/Address";
import Product from "@/models/Product";
import { computePricing } from "@/lib/pricing";
import { ensureProductCdnUrl } from "@/lib/cdn";
import {
  assertVariantIdForProduct,
  formatRecipientFromAddress,
  normalizeDimensions,
} from "@/lib/printful";

function sanitizeQuantity(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 0;
  }
  return Math.floor(numeric);
}

function extractProductId(value) {
  if (!value) return null;

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (typeof value === "object") {
    if (value._id) {
      return extractProductId(value._id);
    }
    if (value.id) {
      return extractProductId(value.id);
    }
    if (typeof value.toString === "function") {
      const stringValue = value.toString();
      if (stringValue && stringValue !== "[object Object]") {
        return stringValue;
      }
    }
  }

  return null;
}

function normalizeCartSnapshot(cartSnapshot = {}) {
  return Object.entries(cartSnapshot || {})
    .map(([key, entry]) => {
      const isObjectEntry = entry && typeof entry === "object";

      const keyParts = key.split("-");
      const productIdSource = isObjectEntry
        ? entry.productId || entry.product || entry.id
        : keyParts[0];
      const productId = extractProductId(productIdSource);

      const quantity = isObjectEntry ? entry.quantity : entry;
      const normalizedQuantity = sanitizeQuantity(quantity);

      if (!productId || !normalizedQuantity) {
        return null;
      }

      const normalized = {
        productId: String(productId),
        quantity: normalizedQuantity,
      };

      const format = isObjectEntry ? entry.format || entry.type : keyParts[1];
      if (format) {
        normalized.format = String(format).toLowerCase();
      }

      const dimensions = isObjectEntry
        ? entry.dimensions || entry.size || entry.variant
        : keyParts[2];
      if (dimensions) {
        normalized.dimensions = dimensions;
      }

      return normalized;
    })
    .filter(Boolean);
}

function normalizeOrderItems(orderDoc = {}) {
  const fromCart = normalizeCartSnapshot(orderDoc?.cartSnapshot);
  if (fromCart.length > 0) {
    return fromCart;
  }

  if (Array.isArray(orderDoc?.items)) {
    return orderDoc.items
      .map((item) => {
        const quantity = sanitizeQuantity(item?.quantity);
        const productId = extractProductId(item?.product ?? item?.productId);

        if (!productId || !quantity) {
          return null;
        }

        const normalized = {
          productId: String(productId),
          quantity,
        };

        if (item?.format) {
          normalized.format = String(item.format).toLowerCase();
        }

        if (item?.dimensions) {
          normalized.dimensions = item.dimensions;
        }

        return normalized;
      })
      .filter(Boolean);
  }

  return [];
}

async function buildPrintfulItems(orderItems = []) {
  if (!Array.isArray(orderItems) || orderItems.length === 0) {
    return [];
  }

  const physicalItems = orderItems
    .map((item) => {
      const format = String(item?.format || "physical").toLowerCase();
      if (format === "digital") {
        return null;
      }

      const productId = extractProductId(item?.productId ?? item?.product);
      const quantity = sanitizeQuantity(item?.quantity);

      if (!productId || !quantity) {
        return null;
      }

      return {
        ...item,
        productId: String(productId),
        quantity,
      };
    })
    .filter(Boolean);

  if (physicalItems.length === 0) {
    return [];
  }

  const uniqueProductIds = [
    ...new Set(physicalItems.map((item) => String(item.productId))),
  ];

  const products = await Product.find({ _id: { $in: uniqueProductIds } }).lean();
  const productMap = new Map(
    products.map((product) => [product._id.toString(), product])
  );

  const items = [];

  for (const item of physicalItems) {
    const quantity = sanitizeQuantity(item?.quantity);
    if (!quantity) continue;

    const product = productMap.get(String(item.productId));
    if (!product) {
      throw new Error(
        `Unable to locate product ${item.productId} for Printful order.`
      );
    }

    const pricing = computePricing(product);
    const sizeForVariant =
      item?.dimensions || pricing.defaultPhysicalDimensions;
    const normalizedSize = normalizeDimensions(sizeForVariant);
    const variantId = assertVariantIdForProduct(
      product,
      sizeForVariant || pricing.defaultPhysicalDimensions
    );
    const normalizedDimensions =
      normalizedSize ||
      normalizeDimensions(pricing.defaultPhysicalDimensions);

    const priceRecord =
      (normalizedSize ? pricing.physicalPricing?.[normalizedSize] : undefined) ||
      pricing.physicalPricing?.[sizeForVariant] ||
      (normalizedDimensions
        ? pricing.physicalPricing?.[normalizedDimensions]
        : undefined);
    const unitPrice = Number(
      priceRecord?.finalPrice ?? pricing.defaultPhysicalFinalPrice
    );

    const cdnUrl = ensureProductCdnUrl(product);
    if (!cdnUrl) {
      const productLabel = product.name || product._id || item.productId;
      throw new Error(
        `Product ${productLabel} is missing artwork required for Printful.`
      );
    }

    const displaySize = normalizedDimensions
      ? normalizedDimensions.replace(/x/g, "×")
      : null;

    const name = displaySize
      ? `${product.name} (${displaySize})`
      : product.name;

    const printfulItem = {
      variant_id: variantId,
      quantity,
      name,
      files: [
        {
          type: "default",
          url: cdnUrl,
        },
      ],
    };

    if (Number.isFinite(unitPrice) && unitPrice > 0) {
      printfulItem.retail_price = unitPrice.toFixed(2);
    }

    items.push(printfulItem);
  }

  return items;
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

  const orderSelection = {
    _id: 1,
    shippingAddressSnapshot: 1,
    address: 1,
    cartSnapshot: 1,
    items: 1,
    shippingService: 1,
  };

  if (requestedOrderId) {
    orderDoc = await Order.findById(requestedOrderId)
      .select(orderSelection)
      .lean();
    if (!orderDoc) {
      return NextResponse.json(
        { error: `Order ${requestedOrderId} was not found.` },
        { status: 404 }
      );
    }
  } else {
    orderDoc = await Order.findOne({}, orderSelection, { sort: { createdAt: -1 } }).lean();
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

  let shippingAddress = orderDoc.shippingAddressSnapshot;

  if (!shippingAddress && orderDoc.address) {
    const addressDoc = await Address.findById(orderDoc.address).lean();
    if (addressDoc) {
      shippingAddress = addressDoc;
    }
  }

  if (!shippingAddress) {
    return NextResponse.json(
      {
        error:
          "The selected order does not include a shipping address. Please update the order and try again.",
      },
      { status: 400 }
    );
  }

  let recipient;
  try {
    recipient = formatRecipientFromAddress(shippingAddress);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to format shipping address for Printful.",
      },
      { status: 400 }
    );
  }

  let orderItems;
  try {
    const normalizedItems = normalizeOrderItems(orderDoc);
    orderItems = await buildPrintfulItems(normalizedItems);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to determine Printful items for the selected order.",
      },
      { status: 400 }
    );
  }

  if (!orderItems || orderItems.length === 0) {
    return NextResponse.json(
      {
        error:
          "The selected order does not contain any physical poster items to submit to Printful.",
      },
      { status: 400 }
    );
  }

  const shippingMethod =
    typeof orderDoc.shippingService === "string" && orderDoc.shippingService
      ? orderDoc.shippingService.toUpperCase()
      : "STANDARD";

  const orderData = {
    external_id: externalId,
    shipping: shippingMethod,
    recipient,
    items: orderItems,
  };

  try {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
    };

    if (process.env.PRINTFUL_STORE_ID) {
      headers["X-PF-Store-Id"] = process.env.PRINTFUL_STORE_ID;
    }

    const response = await fetch("https://api.printful.com/orders", {
      method: "POST",
      headers,
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
