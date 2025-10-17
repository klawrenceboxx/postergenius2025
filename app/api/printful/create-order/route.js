import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import connectDB from "@/config/db";
import Cart from "@/models/Cart";
import Product from "@/models/Product";
import Address from "@/models/Address";
import GuestAddress from "@/models/GuestAddress";
import User from "@/models/User";
import { computePricing } from "@/lib/pricing";
import {
  normalizeDimensions,
  assertVariantId,
  formatRecipientFromAddress,
} from "@/lib/printful";
import { toCdnUrl, S3_BASE_URL } from "@/lib/cdn";

const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;
const PRINTFUL_STORE_ID = process.env.PRINTFUL_STORE_ID || "16958262";
const PRINTFUL_ENDPOINT = "https://api.printful.com/orders";
const DEFAULT_COUNTRY =
  process.env.PRINTFUL_DEFAULT_COUNTRY?.toUpperCase() || "US";

function pickString(...values) {
  for (const value of values) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) {
        return trimmed;
      }
    }
  }
  return "";
}

function normalizeCartItems(items = {}) {
  const normalized = [];

  for (const [key, value] of Object.entries(items || {})) {
    if (!value) continue;

    if (typeof value === "object") {
      const productId = pickString(value.productId, value._id, key.split("__")[0]);
      const quantity = Number(value.quantity ?? 0);
      if (!productId || !Number.isFinite(quantity) || quantity <= 0) {
        continue;
      }

      normalized.push({
        key,
        productId,
        quantity: Math.max(1, Math.floor(quantity)),
        format: pickString(value.format, "physical").toLowerCase(),
        dimensions: pickString(value.dimensions),
        title: pickString(value.title),
        price: value.price != null ? Number(value.price) : null,
      });
      continue;
    }

    const quantity = Number(value);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      continue;
    }

    const [rawProductId, rawFormat, rawDimensions] = key.split("__");
    const productId = pickString(rawProductId, key);
    if (!productId) {
      continue;
    }

    normalized.push({
      key,
      productId,
      quantity: Math.max(1, Math.floor(quantity)),
      format: pickString(rawFormat, "physical").toLowerCase(),
      dimensions: pickString(rawDimensions),
      title: "",
      price: null,
    });
  }

  return normalized;
}

function ensureCdnUrl(product) {
  const cdnCandidate = pickString(product?.cdnUrl, toCdnUrl(product?.s3Url));
  if (!cdnCandidate) {
    throw new Error(
      `Product ${product?._id || product?.id || "unknown"} is missing a CloudFront asset.`
    );
  }

  if (cdnCandidate.startsWith(S3_BASE_URL)) {
    throw new Error(
      `Product ${product?._id || product?.id || "unknown"} is configured with a direct S3 URL.`
    );
  }

  return cdnCandidate;
}

function buildPrintfulItems(cartItems, productMap) {
  const items = [];

  for (const item of cartItems) {
    const product = productMap.get(item.productId);
    if (!product) {
      throw new Error(`Unable to locate product ${item.productId} for checkout.`);
    }

    const format = (item.format || "physical").toLowerCase();
    if (format === "digital") {
      continue;
    }

    if (product.printfulEnabled === false) {
      throw new Error(
        `Product ${product._id} is not enabled for Printful fulfillment.`
      );
    }

    const pricing = computePricing(product);
    const chosenDimensions = item.dimensions || pricing.defaultPhysicalDimensions;
    const normalizedDimensions =
      normalizeDimensions(chosenDimensions) ||
      normalizeDimensions(pricing.defaultPhysicalDimensions);

    const variantReference =
      normalizedDimensions || pricing.defaultPhysicalDimensions || chosenDimensions;
    const variantId = assertVariantId(variantReference);

    const priceRecord =
      pricing.physicalPricing?.[chosenDimensions] ||
      (normalizedDimensions ? pricing.physicalPricing?.[normalizedDimensions] : null);

    const retailPrice = priceRecord?.finalPrice ?? pricing.defaultPhysicalFinalPrice;
    const quantity = Math.max(1, Number(item.quantity) || 1);
    const name = pickString(item.title, product.name, "Poster");
    const cdnUrl = ensureCdnUrl(product);

    const entry = {
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

    if (retailPrice != null && Number.isFinite(Number(retailPrice))) {
      entry.retail_price = Number(retailPrice).toFixed(2);
    }

    items.push(entry);
  }

  return items;
}

async function resolveRecipient({ userId, guestId, body }) {
  if (userId) {
    const [userDoc, addressDoc] = await Promise.all([
      User.findOne({ userId }).lean(),
      body?.addressId ? Address.findById(body.addressId).lean() : null,
    ]);

    const inlineAddress = body?.shippingAddress || body?.recipient || null;

    const sourceAddress = addressDoc
      ? {
          fullName: addressDoc.fullName,
          area: addressDoc.area,
          city: addressDoc.city,
          state: addressDoc.state,
          pincode: addressDoc.pincode,
          phoneNumber: addressDoc.phoneNumber,
          address1: inlineAddress?.address1,
          address2: inlineAddress?.address2,
          country:
            pickString(
              inlineAddress?.country,
              inlineAddress?.country_code,
              inlineAddress?.countryCode,
              DEFAULT_COUNTRY
            ) || DEFAULT_COUNTRY,
        }
      : inlineAddress;

    if (!sourceAddress) {
      throw new Error("Shipping address is required for the logged-in checkout.");
    }

    const recipient = formatRecipientFromAddress(sourceAddress, {
      fallbackCountry: DEFAULT_COUNTRY,
    });

    const email = pickString(
      body?.email,
      inlineAddress?.email,
      userDoc?.email
    );

    if (!email) {
      throw new Error("An email address is required to create the Printful order.");
    }

    if (!recipient.phone) {
      const phone = pickString(inlineAddress?.phone, addressDoc?.phoneNumber);
      if (phone) {
        recipient.phone = phone;
      }
    }

    return { ...recipient, email };
  }

  const guestAddressDoc = await GuestAddress.findOne({ guestId }).lean();
  const inlineAddress = body?.shippingAddress || body?.recipient || null;

  const sourceAddress = guestAddressDoc
    ? {
        fullName: guestAddressDoc.fullName,
        email: guestAddressDoc.email,
        phone: guestAddressDoc.phone,
        address1: guestAddressDoc.street,
        city: guestAddressDoc.city,
        postalCode: guestAddressDoc.postalCode,
        country: guestAddressDoc.country,
        province: guestAddressDoc.province,
      }
    : inlineAddress;

  if (!sourceAddress) {
    throw new Error("Shipping address is required for guest checkout.");
  }

  const recipient = formatRecipientFromAddress(sourceAddress, {
    fallbackCountry: DEFAULT_COUNTRY,
  });

  const email = pickString(
    body?.email,
    inlineAddress?.email,
    guestAddressDoc?.email,
    sourceAddress?.email
  );

  if (!email) {
    throw new Error("An email address is required to create the Printful order.");
  }

  if (!recipient.phone) {
    const phone = pickString(
      inlineAddress?.phone,
      guestAddressDoc?.phone,
      sourceAddress?.phone
    );
    if (phone) {
      recipient.phone = phone;
    }
  }

  return { ...recipient, email };
}

export async function POST(request) {
  try {
    if (!PRINTFUL_API_KEY) {
      return NextResponse.json(
        { success: false, message: "Printful API key is not configured." },
        { status: 500 }
      );
    }

    const auth = getAuth(request);
    const userId = auth?.userId || null;

    let body = {};
    try {
      body = await request.json();
    } catch (error) {
      body = {};
    }

    const headerGuestId = request.headers.get("x-guest-id");
    const guestId = userId
      ? null
      : pickString(body?.guestId, headerGuestId) || null;

    if (!userId && (!guestId || typeof guestId !== "string")) {
      return NextResponse.json(
        {
          success: false,
          message: "guestId is required when creating orders as a guest.",
        },
        { status: 400 }
      );
    }

    await connectDB();

    const cartQuery = userId ? { userId } : { guestId };
    const cart = await Cart.findOne(cartQuery).lean();

    if (!cart || !cart.items || Object.keys(cart.items).length === 0) {
      return NextResponse.json(
        { success: false, message: "Cart is empty." },
        { status: 400 }
      );
    }

    const normalizedItems = normalizeCartItems(cart.items);
    if (normalizedItems.length === 0) {
      return NextResponse.json(
        { success: false, message: "No valid cart items found." },
        { status: 400 }
      );
    }

    const productIds = [...new Set(normalizedItems.map((item) => item.productId))];
    const products = await Product.find({ _id: { $in: productIds } }).lean();
    const productMap = new Map(
      products.map((product) => [product._id.toString(), product])
    );

    if (productMap.size !== productIds.length) {
      const missing = productIds.filter((id) => !productMap.has(id));
      throw new Error(
        `Unable to locate products for the following ids: ${missing.join(", ")}.`
      );
    }

    const itemsForPrintful = buildPrintfulItems(normalizedItems, productMap);
    if (itemsForPrintful.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No physical items available for Printful fulfillment.",
        },
        { status: 400 }
      );
    }

    const recipient = await resolveRecipient({ userId, guestId, body });

    const shippingMethod = pickString(body?.shipping, "STANDARD").toUpperCase();
    const externalId = pickString(
      body?.externalId,
      cart?._id ? `cart-${cart._id.toString()}` : ""
    );

    const orderData = {
      shipping: shippingMethod || "STANDARD",
      recipient,
      items: itemsForPrintful,
    };

    if (externalId) {
      orderData.external_id = externalId;
    }

    const response = await fetch(PRINTFUL_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PRINTFUL_API_KEY}`,
        "Content-Type": "application/json",
        "X-PF-Store-Id": PRINTFUL_STORE_ID,
      },
      body: JSON.stringify(orderData),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message =
        payload?.error?.message ||
        payload?.error ||
        payload?.message ||
        "Failed to create Printful order.";

      return NextResponse.json(
        { success: false, message, error: payload },
        { status: response.status || 500 }
      );
    }

    await Cart.findOneAndUpdate(cartQuery, { items: {} });

    return NextResponse.json({
      success: true,
      order: payload?.result || payload,
      payload: orderData,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: error.status || 500 }
    );
  }
}
