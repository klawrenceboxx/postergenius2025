import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import connectDB from "@/config/db";
import Address from "@/models/Address";
import Product from "@/models/Product";
import { computePricing } from "@/lib/pricing";
import {
  calculateShippingRates,
  formatRecipientFromAddress,
  assertVariantIdForProduct,
  normalizeDimensions,
  pickCheapestRate,
} from "@/lib/printful";
import { ensureProductCdnUrl } from "@/lib/cdn";

export const runtime = "nodejs";

const CACHE_TTL_MS = 10 * 60 * 1000;
const shippingQuoteCache = new Map();

function buildCacheKey({ recipient, items }) {
  const locationKey = [
    recipient?.country_code || "",
    recipient?.state_code || "",
    recipient?.zip || "",
  ].join(":");

  const itemKey = (items || [])
    .map((item) => `${item.variant_id}:${item.quantity || 0}`)
    .sort()
    .join("|");

  return `${locationKey}::${itemKey}`;
}

function getCachedRates(cacheKey) {
  if (!cacheKey) return null;
  const entry = shippingQuoteCache.get(cacheKey);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    shippingQuoteCache.delete(cacheKey);
    return null;
  }
  return entry.rates;
}

function setCachedRates(cacheKey, rates) {
  if (!cacheKey) return;
  shippingQuoteCache.set(cacheKey, {
    rates,
    timestamp: Date.now(),
  });
}

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
      throw new Error("Each item must include a productId when estimating shipping.");
    }

    const product = await Product.findById(productId).lean();
    if (!product) {
      throw new Error(`Unable to locate product ${productId} for shipping calculation.`);
    }

    const cdnUrl = ensureProductCdnUrl(product);
    if (!cdnUrl) {
      console.warn(
        "⚠️ Missing cdnUrl for product. Printful shipping may fail to render artwork.",
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
      chosenDimensions || pricing.defaultPhysicalDimensions;
    const variantId = assertVariantIdForProduct(product, sizeForVariant);

    const priceRecord = pricing.physicalPricing?.[chosenDimensions] ||
      pricing.physicalPricing?.[normalizedDimensions];
    const unitPrice =
      Number(priceRecord?.finalPrice ?? pricing.defaultPhysicalFinalPrice);

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

    await connectDB();

    const body = await request.json();
    const { addressId, address: inlineAddress, items, cheapestOnly = false } = body || {};

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
      return NextResponse.json({ success: true, rates: [] });
    }

    const cacheKey = buildCacheKey({ recipient, items: physicalItems });
    const cachedRates = getCachedRates(cacheKey);

    if (cachedRates) {
      console.log("[Printful] Shipping cache hit", cacheKey);
      if (cheapestOnly) {
        const cheapest = pickCheapestRate(cachedRates);
        return NextResponse.json({
          success: true,
          rates: cheapest ? [cheapest] : [],
          cache: true,
        });
      }

      return NextResponse.json({ success: true, rates: cachedRates, cache: true });
    }

    console.log("[Printful] Shipping cache miss", cacheKey);
    const rates = await calculateShippingRates({ recipient, items: physicalItems });
    setCachedRates(cacheKey, rates);

    if (cheapestOnly) {
      const cheapest = pickCheapestRate(rates);
      return NextResponse.json({ success: true, rates: cheapest ? [cheapest] : [] });
    }

    return NextResponse.json({ success: true, rates });
  } catch (error) {
    console.error("[Printful] Shipping rate error:", error);
    const status = error.status || 500;
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Unable to calculate shipping rates",
      },
      { status }
    );
  }
}
