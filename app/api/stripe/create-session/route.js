import Stripe from "stripe";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import connectDB from "@/config/db";
import Product from "@/models/Product";
import Address from "@/models/Address";
import GuestAddress from "@/models/GuestAddress";
import Promo from "@/models/PromoModel";
import { computePricing } from "@/lib/pricing";
import { ensureProductCdnUrl } from "@/lib/cdn";
import {
  calculateShippingRates,
  formatRecipientFromAddress,
  normalizeDimensions,
  assertVariantIdForProduct,
  pickCheapestRate,
} from "@/lib/printful";
import { applyPromo } from "@/lib/promoCode";
import { STORE_EVENT_TYPES, recordStoreEvents } from "@/lib/storeEvents";
import {
  buildStripeCouponPayload,
  buildStripeTaxLineItem,
  getStripeCurrency,
} from "@/lib/stripeCheckout";
import {
  sanitizeEnum,
  sanitizeIdentifier,
  sanitizeNumber,
  sanitizePlainText,
  sanitizeRelativeOrAbsoluteUrl,
  sanitizeEmail,
} from "@/lib/security/input";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const STRIPE_CURRENCY = getStripeCurrency();

function extractGuestId(request, body = {}) {
  return sanitizeIdentifier(body?.guestId || request.headers.get("x-guest-id"), {
    maxLength: 128,
  });
}

function withCheckoutSessionPlaceholder(url) {
  const fallback = process.env.STRIPE_SUCCESS_URL || "";
  const target = url || fallback;

  if (!target) return target;
  if (target.includes("{CHECKOUT_SESSION_ID}")) return target;

  const separator = target.includes("?") ? "&" : "?";
  return `${target}${separator}session_id={CHECKOUT_SESSION_ID}`;
}

function sanitizeCheckoutItems(items = []) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => {
      const productId = sanitizeIdentifier(item?.productId, { maxLength: 64 });
      const quantity = sanitizeNumber(item?.quantity, {
        min: 1,
        max: 25,
        fallback: 0,
      });

      if (!productId || quantity <= 0) {
        return null;
      }

      return {
        productId,
        quantity,
        format: sanitizeEnum(item?.format, ["physical", "digital"], "physical"),
        dimensions: sanitizePlainText(item?.dimensions, { maxLength: 32 }),
        price: sanitizeNumber(item?.price, { min: 0, fallback: 0 }),
      };
    })
    .filter(Boolean);
}

function isGuestAddressComplete(addressDoc) {
  return Boolean(
    addressDoc &&
      [
        addressDoc.fullName,
        addressDoc.email,
        addressDoc.phone,
        addressDoc.street,
        addressDoc.city,
        addressDoc.postalCode,
        addressDoc.country,
        addressDoc.province,
      ].every(Boolean)
  );
}

export async function POST(request) {
  try {
    console.log("=== [CREATE SESSION API] START ===");

    const auth = getAuth(request);
    const body = await request.json();
    const userId = auth.userId || null;
    const guestId = userId ? null : extractGuestId(request, body);

    if (!userId && !guestId) {
      console.error("❌ Missing checkout identity");
      return NextResponse.json({
        success: false,
        message: "Please sign in or continue as a guest before checkout.",
      });
    }

    console.log("🔑 Checkout identity:", { userId, guestId });

    const items = sanitizeCheckoutItems(body?.items);
    const address = sanitizeIdentifier(body?.address, { maxLength: 64 });
    const successUrl = sanitizeRelativeOrAbsoluteUrl(body?.successUrl);
    const cancelUrl = sanitizeRelativeOrAbsoluteUrl(body?.cancelUrl);
    const promoCode = sanitizePlainText(body?.promoCode, { maxLength: 64 });
    const requestedCustomerEmail = sanitizeEmail(body?.customerEmail);
    console.log("📦 Items received:", JSON.stringify(items, null, 2));
    console.log("🏠 Address received:", address);

    if (!items || items.length === 0) {
      console.error("❌ Invalid data provided");
      return NextResponse.json({ success: false, message: "Invalid data" });
    }

    await connectDB();
    console.log("✅ DB connected");

    const guestAddressDoc = guestId
      ? await GuestAddress.findOne({ guestId }).lean()
      : null;

    if (guestId && !isGuestAddressComplete(guestAddressDoc)) {
      return NextResponse.json({
        success: false,
        message:
          "Complete the required guest checkout details before payment.",
      });
    }

    // Build line items + calculate totals
    const lineItems = [];
    let cartTotal = 0;
    const physicalForPrintful = [];
    for (const item of items) {
      const product = await Product.findById(item.productId).lean();
      if (!product) {
        console.warn("⚠️ Product not found for ID:", item.productId);
        continue;
      }

      const cdnUrl = ensureProductCdnUrl(product);
      if (!cdnUrl) {
        console.warn(
          "⚠️ Missing cdnUrl for product. Printful may not receive artwork.",
          { productId: product._id }
        );
      }

      const pricing = computePricing(product);
      const format = (item.format || "physical").toLowerCase();
      const dimensions = item.dimensions || pricing.defaultPhysicalDimensions;

      let unitPrice = pricing.defaultPhysicalFinalPrice;
      let descriptor = "Physical";

      if (format === "digital") {
        unitPrice = pricing.digitalFinalPrice;
        descriptor = "Digital";
      } else if (dimensions) {
        const match = pricing.physicalPricing?.[dimensions];
        if (match?.finalPrice != null) {
          unitPrice = match.finalPrice;
        }
      }

      unitPrice = Math.max(0, Number(unitPrice) || 0);
      if (unitPrice === 0) {
        console.warn("⚠️ Computed price was zero for product", product._id);
        continue;
      }

      const quantity = Math.max(1, Number(item.quantity) || 1);
      const subtotal = unitPrice * quantity;
      cartTotal += subtotal;

      const nameSegments = [product.name];
      if (descriptor) nameSegments.push(descriptor);
      if (format !== "digital" && dimensions) nameSegments.push(dimensions);

      lineItems.push({
        price_data: {
          currency: STRIPE_CURRENCY,
          product_data: { name: nameSegments.filter(Boolean).join(" – ") },
          unit_amount: Math.round(unitPrice * 100),
        },
        quantity,
      });

      if (format !== "digital") {
        const normalizedDimensions =
          normalizeDimensions(dimensions) ||
          normalizeDimensions(pricing.defaultPhysicalDimensions);
        try {
          const sizeForVariant =
            dimensions || pricing.defaultPhysicalDimensions;
          const variantId = assertVariantIdForProduct(product, sizeForVariant);
          physicalForPrintful.push({
            variant_id: variantId,
            quantity,
            retail_price: unitPrice.toFixed(2),
          });
        } catch (err) {
          console.error("⚠️ Unable to map variant for item", {
            product: product._id,
            dimensions,
            error: err.message,
          });
          throw err;
        }
      }
    }

    const subtotal = cartTotal;
    const tax = parseFloat((subtotal * 0.13).toFixed(2));
    const total = subtotal + tax;
    console.log(
      "💰 Totals => Subtotal:",
      subtotal,
      "Tax:",
      tax,
      "Total:",
      total
    );

    const hasPhysicalItems = physicalForPrintful.length > 0;
    let shippingMetadata = null;
    let recipientSnapshot = null;
    let shippingAddressSnapshot = null;
    let customerEmail = requestedCustomerEmail || "";
    let shippingAmount = 0;
    let originalShippingAmount = 0;
    let shippingCurrency = STRIPE_CURRENCY;
    let shippingLineItem = null;

    if (hasPhysicalItems && !address && !guestId) {
      console.error("❌ Missing address for physical order checkout");
      return NextResponse.json({
        success: false,
        message: "Shipping address required for physical items",
      });
    }

    if (hasPhysicalItems) {
      const addressDoc = userId
        ? await Address.findById(address).lean()
        : guestAddressDoc;
      if (!addressDoc) {
        console.error("❌ Shipping address not found for", address);
        return NextResponse.json({
          success: false,
          message: "Shipping address not found",
        });
      }

      shippingAddressSnapshot = userId
        ? {
            fullName: addressDoc.fullName,
            phone: addressDoc.phoneNumber,
            street: addressDoc.area,
            city: addressDoc.city,
            postalCode: addressDoc.pincode,
            country: addressDoc.country || "CA",
            province: addressDoc.state,
          }
        : {
            fullName: addressDoc.fullName,
            email: addressDoc.email,
            phone: addressDoc.phone,
            street: addressDoc.street,
            city: addressDoc.city,
            postalCode: addressDoc.postalCode,
            country: addressDoc.country,
            province: addressDoc.province,
          };

      if (!customerEmail) {
        customerEmail = sanitizeEmail(
          userId ? requestedCustomerEmail || "" : addressDoc.email || ""
        );
      }

      const recipient = formatRecipientFromAddress(addressDoc);
      recipientSnapshot = {
        name: recipient.name,
        address1: recipient.address1,
        address2: recipient.address2,
        city: recipient.city,
        state_code: recipient.state_code,
        zip: recipient.zip,
        country_code: recipient.country_code,
        phone: recipient.phone,
      };

      try {
        const shippingRates = await calculateShippingRates({
          recipient,
          items: physicalForPrintful,
        });

        const chosenRate = pickCheapestRate(shippingRates);
        if (!chosenRate) {
          throw new Error("No shipping rates returned by Printful");
        }

        const computedShipping = Number(chosenRate.rate || 0);
        if (!Number.isFinite(computedShipping)) {
          throw new Error("Invalid shipping rate returned by Printful");
        }

        originalShippingAmount = Math.max(computedShipping, 0);
        shippingAmount = originalShippingAmount;
        shippingCurrency = STRIPE_CURRENCY;
        shippingLineItem =
          shippingAmount > 0
            ? {
                price_data: {
                  currency: shippingCurrency,
                  product_data: {
                    name: `Shipping – ${chosenRate.name || "Standard"}`,
                  },
                  unit_amount: Math.round(shippingAmount * 100),
                },
                quantity: 1,
              }
            : null;

        shippingMetadata = {
          id: chosenRate.id,
          name: chosenRate.name,
          rate: chosenRate.rate,
          currency: chosenRate.currency || "USD",
          minDays:
            chosenRate.min_delivery_days ?? chosenRate.minDeliveryDays ?? null,
          maxDays:
            chosenRate.max_delivery_days ?? chosenRate.maxDeliveryDays ?? null,
        };
      } catch (error) {
        console.error("❌ Failed to fetch shipping rates:", error);
        return NextResponse.json({
          success: false,
          message: "Unable to calculate shipping for this address",
        });
      }
    }

    if (!customerEmail && guestId) {
      customerEmail = sanitizeEmail(guestAddressDoc?.email);
      if (!shippingAddressSnapshot && guestAddressDoc) {
        shippingAddressSnapshot = {
          fullName: guestAddressDoc.fullName,
          email: guestAddressDoc.email,
          phone: guestAddressDoc.phone,
          street: guestAddressDoc.street,
          city: guestAddressDoc.city,
          postalCode: guestAddressDoc.postalCode,
          country: guestAddressDoc.country,
          province: guestAddressDoc.province,
        };
      }
    }

    const goodsTotal = Number((subtotal + tax).toFixed(2));
    const originalTotalBeforeDiscount = Number(
      (goodsTotal + originalShippingAmount).toFixed(2)
    );

    let promoResult = {
      valid: false,
      discount: 0,
      newTotal: originalTotalBeforeDiscount,
      originalTotal: originalTotalBeforeDiscount,
      promoType: null,
      promoValue: null,
      promoCode: null,
      message: "",
    };

    const trimmedPromoCode = (promoCode || "").trim();

    if (trimmedPromoCode) {
      try {
        const promo = await Promo.findOne({
          code: trimmedPromoCode,
          isActive: true,
        }).lean();

        if (promo) {
          promoResult = applyPromo(
            {
              items: items.map((item) => ({
                productId: item.productId,
                quantity: Number(item.quantity ?? 0),
                format: item.format ?? "physical",
                price: Number(item.price ?? 0),
                lineTotal: Number(
                  (
                    Number(item.price ?? 0) * Number(item.quantity ?? 0)
                  ).toFixed(2)
                ),
              })),
              totalPrice: goodsTotal,
              shippingCost: originalShippingAmount,
            },
            promo
          );
        } else {
          promoResult = {
            ...promoResult,
            promoCode: trimmedPromoCode,
            message: "Invalid code",
            valid: false,
          };
        }
      } catch (error) {
        console.error("❌ Promo lookup failed:", error);
        promoResult = {
          ...promoResult,
          promoCode: trimmedPromoCode,
          message: "Unable to apply promo",
          valid: false,
        };
      }
    }

    if (promoResult.valid && promoResult.promoType === "shipping") {
      shippingLineItem = null;
      shippingAmount = 0;
    }

    const taxLineItem = buildStripeTaxLineItem(tax, STRIPE_CURRENCY);
    if (taxLineItem) {
      lineItems.push(taxLineItem);
    }

    if (shippingLineItem) {
      lineItems.push(shippingLineItem);
    }

    const totalBeforeDiscount = Number(
      (goodsTotal + (shippingLineItem ? shippingAmount : 0)).toFixed(2)
    );
    const finalTotal = promoResult.valid
      ? Number(promoResult.newTotal ?? totalBeforeDiscount)
      : totalBeforeDiscount;
    const safeFinalTotal = Number.isFinite(finalTotal)
      ? finalTotal
      : totalBeforeDiscount;

    let couponId = null;
    const couponPayload = buildStripeCouponPayload(
      promoResult,
      STRIPE_CURRENCY
    );
    if (couponPayload) {
      const coupon = await stripe.coupons.create(couponPayload);
      couponId = coupon.id;
    }

    const orderType = hasPhysicalItems ? "physical" : "digital";

    let responseData;
    if (cartTotal > 50000) {
      console.log("➡️ Creating Payment Intent (large order)...");
      const paymentAmountCents = Math.round(Math.max(safeFinalTotal, 0) * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: paymentAmountCents,
        currency: STRIPE_CURRENCY,
        metadata: {
          ...(userId ? { userId } : {}),
          ...(guestId ? { guestId } : {}),
          ...(address ? { address } : {}),
          items: JSON.stringify(items),
          subtotalAmount: subtotal.toFixed(2),
          taxAmount: tax.toFixed(2),
          totalAmount: safeFinalTotal.toFixed(2),
          currency: STRIPE_CURRENCY,
          ...(shippingAddressSnapshot
            ? { shippingAddressSnapshot: JSON.stringify(shippingAddressSnapshot) }
            : {}),
          ...(customerEmail ? { customerEmail } : {}),
          ...(promoResult.valid
            ? {
                promo: JSON.stringify({
                  code: promoResult.promoCode || trimmedPromoCode,
                  type: promoResult.promoType,
                  value: promoResult.promoValue,
                  discount: promoResult.discount,
                }),
              }
            : {}),
        },
      });
      console.log("✅ Payment Intent created:", paymentIntent.id);

      responseData = {
        type: "payment_intent",
        clientSecret: paymentIntent.client_secret,
      };
    } else {
      console.log("➡️ Creating Checkout Session...");
      const metadata = {
        ...(userId ? { userId } : {}),
        ...(guestId ? { guestId } : {}),
        ...(address ? { address } : {}),
        items: JSON.stringify(
          items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            format: i.format ?? null,
            dimensions: i.dimensions ?? null,
          }))
        ),
        orderType,
        subtotalAmount: subtotal.toFixed(2),
        taxAmount: tax.toFixed(2),
        totalAmount: safeFinalTotal.toFixed(2),
        currency: STRIPE_CURRENCY,
      };

      if (shippingAddressSnapshot) {
        metadata.shippingAddressSnapshot = JSON.stringify(shippingAddressSnapshot);
      }

      if (customerEmail) {
        metadata.customerEmail = customerEmail;
      }

      if (shippingMetadata) {
        metadata.shipping = JSON.stringify(shippingMetadata);
      }

      if (recipientSnapshot) {
        metadata.recipient = JSON.stringify(recipientSnapshot);
      }

      if (promoResult.valid) {
        metadata.promo = JSON.stringify({
          code: promoResult.promoCode || trimmedPromoCode,
          type: promoResult.promoType,
          value: promoResult.promoValue,
          discount: promoResult.discount,
        });
      } else if (trimmedPromoCode) {
        metadata.promoAttempt = trimmedPromoCode;
      }

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: lineItems,
        success_url: withCheckoutSessionPlaceholder(successUrl),
        cancel_url: cancelUrl || process.env.STRIPE_CANCEL_URL,
        metadata,
        ...(customerEmail ? { customer_email: customerEmail } : {}),
        ...(couponId ? { discounts: [{ coupon: couponId }] } : {}),
      });

      console.log("✅ Checkout Session created:", session.id, session.url);

      responseData = {
        type: "checkout_session",
        sessionId: session.id,
        url: session.url,
      };
    }

    console.log("=== [CREATE SESSION API] END ===");

    try {
      await recordStoreEvents(
        items.map((item) => ({
          eventType: STORE_EVENT_TYPES.CHECKOUT_STARTED,
          productId: item.productId,
          userId,
          format: item.format || "physical",
          dimensions: item.dimensions || null,
          quantity: Math.max(1, Number(item.quantity) || 1),
          source: "stripe_create_session",
          metadata: {
            checkoutType: responseData.type,
            promoCode: trimmedPromoCode || null,
          },
        }))
      );
    } catch (trackingError) {
      console.error(
        "[stripe-create-session] Failed to record checkout events",
        trackingError
      );
    }

    return NextResponse.json({ success: true, ...responseData });
  } catch (error) {
    console.error("❌ ERROR in create-session:", error.message, error.stack);
    return NextResponse.json({ success: false, message: error.message });
  }
}
