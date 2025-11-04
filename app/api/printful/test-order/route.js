import { NextResponse } from "next/server";
import connectDB from "@/config/db";
import Order from "@/models/Order";
import Address from "@/models/Address";
import Product from "@/models/Product";
import { ensureProductCdnUrl } from "@/lib/cdn";
import { formatRecipientFromAddress } from "@/lib/printful";

function sanitizeQuantity(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 1;
  }
  return Math.floor(numeric);
}

function buildItemName(productDoc, item) {
  const baseName =
    typeof productDoc?.name === "string" && productDoc.name.trim()
      ? productDoc.name.trim()
      : "Printful Item";

  const dimensionLabel =
    typeof item?.dimensions === "string" && item.dimensions.trim()
      ? item.dimensions.trim()
      : null;

  return dimensionLabel ? `${baseName} (${dimensionLabel})` : baseName;
}

function toProductKey(product) {
  if (!product) return null;
  try {
    return product.toString();
  } catch (error) {
    try {
      return String(product);
    } catch (stringError) {
      return null;
    }
  }
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
    items: 1,
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

  // === Build test order data ===
  const itemsWithVariants = (orderDoc.items || []).filter((item) => {
    if (!item) return false;
    const variantId = item.printfulVariantId;
    if (typeof variantId === "number") return true;
    if (typeof variantId === "string") return variantId.trim() !== "";
    return typeof variantId !== "undefined" && variantId !== null;
  });

  if (itemsWithVariants.length === 0) {
    return NextResponse.json(
      {
        error:
          "The selected order does not include an item with a Printful variant ID.",
      },
      { status: 400 }
    );
  }

  const productIds = [
    ...new Set(
      itemsWithVariants.map((item) => toProductKey(item?.product)).filter(Boolean)
    ),
  ];

  let productMap = new Map();

  if (productIds.length > 0) {
    const products = await Product.find({ _id: { $in: productIds } })
      .select({
        name: 1,
        cdnUrl: 1,
        s3Url: 1,
        primaryImageKey: 1,
        image: 1,
        digitalFileUrl: 1,
      })
      .lean();

    productMap = new Map(
      products.map((product) => [product._id.toString(), product])
    );
  }

  const resolvedItems = itemsWithVariants.map((item) => {
    const productId = toProductKey(item?.product);
    const productDoc = productId ? productMap.get(productId) : null;
    const quantity = sanitizeQuantity(item?.quantity);
    const name = buildItemName(productDoc, item);

    const cdnUrl = productDoc ? ensureProductCdnUrl(productDoc) : null;

    const itemPayload = {
      variant_id: item.printfulVariantId,
      quantity,
      name,
    };

    if (cdnUrl) {
      itemPayload.files = [
        {
          type: "default",
          url: cdnUrl,
        },
      ];
    }

    return itemPayload;
  });

  const orderData = {
    external_id: externalId,
    shipping: "STANDARD",
    recipient,
    items: resolvedItems,
  };

  try {
    const response = await fetch("https://api.printful.com/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
        "X-PF-Store-Id": "16958262", // ✅ Add your actual store ID here
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
