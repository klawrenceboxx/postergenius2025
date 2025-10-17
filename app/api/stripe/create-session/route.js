import Stripe from "stripe";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import connectDB from "@/config/db";
import Product from "@/models/Product";
import Address from "@/models/Address";
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

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  try {
    console.log("=== [CREATE SESSION API] START ===");

    const auth = getAuth(request);
    if (!auth.userId) {
      console.error("❌ Unauthorized user");
      return NextResponse.json({ success: false, message: "Unauthorized" });
    }
    const userId = auth.userId;
    console.log("🔑 User ID:", userId);

    const { items, address, successUrl, cancelUrl, promoCode } =
      await request.json();
    console.log("📦 Items received:", JSON.stringify(items, null, 2));
    console.log("🏠 Address received:", address);

    if (!items || items.length === 0) {
      console.error("❌ Invalid data provided");
      return NextResponse.json({ success: false, message: "Invalid data" });
    }

    await connectDB();
    console.log("✅ DB connected");

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
          currency: "usd",
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
          const variantId = assertVariantIdForProduct(
            product,
            sizeForVariant
          );
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
    let shippingAmount = 0;
    let originalShippingAmount = 0;
    let shippingCurrency = "usd";
    let shippingLineItem = null;

    if (hasPhysicalItems && !address) {
      console.error("❌ Missing address for physical order checkout");
      return NextResponse.json({
        success: false,
        message: "Shipping address required for physical items",
      });
    }

    if (hasPhysicalItems) {
      const addressDoc = await Address.findById(address).lean();
      if (!addressDoc) {
        console.error("❌ Shipping address not found for", address);
        return NextResponse.json({
          success: false,
          message: "Shipping address not found",
        });
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
        shippingCurrency = (chosenRate.currency || "USD").toLowerCase();
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
    if (
      promoResult.valid &&
      promoResult.discount > 0 &&
      promoResult.promoType !== "shipping"
    ) {
      const appliedDiscount = Math.max(Number(promoResult.discount ?? 0), 0);

      if (promoResult.promoType === "percent") {
        const percentOff = Math.min(
          Math.max(Number(promoResult.promoValue ?? 0), 0),
          100
        );

        if (percentOff > 0) {
          const coupon = await stripe.coupons.create({
            percent_off: percentOff,
            duration: "once",
          });
          couponId = coupon.id;
        }
      } else if (appliedDiscount > 0) {
        const amountOffCents = Math.round(appliedDiscount * 100);
        const coupon = await stripe.coupons.create({
          amount_off: amountOffCents,
          currency: "usd",
          duration: "once",
        });
        couponId = coupon.id;
      }
    }

    const orderType = hasPhysicalItems ? "physical" : "digital";

    let responseData;
    if (cartTotal > 50000) {
      console.log("➡️ Creating Payment Intent (large order)...");
      const paymentAmountCents = Math.round(Math.max(safeFinalTotal, 0) * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: paymentAmountCents,
        currency: "usd",
        metadata: {
          userId,
          address,
          items: JSON.stringify(items),
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
        userId,
        address,
        items: JSON.stringify(
          items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            format: i.format ?? null,
            dimensions: i.dimensions ?? null,
          }))
        ),
        orderType,
      };

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
        success_url: successUrl || process.env.STRIPE_SUCCESS_URL,
        cancel_url: cancelUrl || process.env.STRIPE_CANCEL_URL,
        metadata,
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
    return NextResponse.json({ success: true, ...responseData });
  } catch (error) {
    console.error("❌ ERROR in create-session:", error.message, error.stack);
    return NextResponse.json({ success: false, message: error.message });
  }
}
