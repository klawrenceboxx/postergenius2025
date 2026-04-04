import Stripe from "stripe";
import { NextResponse } from "next/server";
import {
  sanitizeMultilineText,
  sanitizeNumber,
  sanitizePlainText,
  sanitizeRelativeOrAbsoluteUrl,
} from "@/lib/security/input";

const getBaseUrl = (request) => {
  return (
    process.env.NEXT_PUBLIC_URL ||
    request.headers.get("origin") ||
    "http://localhost:3000"
  );
};

const normaliseCartItems = (cart = {}) => {
  if (!Array.isArray(cart.items)) return [];

  return cart.items
    .map((item, index) => {
      const quantity = Math.max(Number(item?.quantity ?? 1), 1);
      const price = sanitizeNumber(item?.price ?? 0, { min: 0, fallback: 0 });
      const unitAmountCents = Math.round(price * 100);

      if (!Number.isFinite(unitAmountCents) || unitAmountCents < 0) {
        return null;
      }

      const name =
        sanitizePlainText(
          item?.title || item?.name || item?.productName || `Item ${index + 1}`,
          { maxLength: 160 }
        ) || `Item ${index + 1}`;

      return {
        name,
        quantity,
        unitAmountCents,
      };
    })
    .filter(Boolean);
};

export async function POST(request) {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return NextResponse.json(
        { success: false, message: "Missing Stripe configuration" },
        { status: 500 }
      );
    }

    const stripe = new Stripe(stripeSecretKey);
    const { cart = {}, promoCode, successUrl, cancelUrl } = await request.json();

    const lineItems = normaliseCartItems(cart);
    if (!lineItems.length) {
      return NextResponse.json(
        { success: false, message: "Cart is empty" },
        { status: 400 }
      );
    }

    const currency =
      sanitizePlainText(cart.currency || "cad", { maxLength: 8 }).toLowerCase() ||
      "cad";
    const shippingCost = sanitizeNumber(cart.shippingCost ?? 0, {
      min: 0,
      fallback: 0,
    });
    const subtotalCents = lineItems.reduce(
      (sum, item) => sum + item.unitAmountCents * item.quantity,
      0
    );
    const shippingCents = Math.round(shippingCost * 100);
    const originalTotalCents = subtotalCents + shippingCents;

    let discountResult = {
      valid: false,
      discount: 0,
      newTotal: Number((originalTotalCents / 100).toFixed(2)),
      originalTotal: Number((originalTotalCents / 100).toFixed(2)),
      promoType: null,
      promoValue: null,
    };

    if (promoCode) {
      try {
        const validationResponse = await fetch(
          `${getBaseUrl(request)}/api/promo/validate`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              code: sanitizePlainText(promoCode, { maxLength: 64 }),
              cart: {
                items: cart.items,
                totalPrice: sanitizeNumber(cart.totalPrice ?? subtotalCents / 100, {
                  min: 0,
                  fallback: subtotalCents / 100,
                }),
                shippingCost,
              },
            }),
          }
        );

        const body = await validationResponse.json();
        if (validationResponse.ok && body?.valid) {
          discountResult = body;
        } else if (body?.message) {
          console.warn("Promo validation failed:", body.message);
        }
      } catch (error) {
        console.error("Promo validation request failed:", error);
      }
    }

    let couponId;
    if (
      discountResult.valid &&
      discountResult.discount > 0 &&
      discountResult.promoType !== "shipping"
    ) {
      if (discountResult.promoType === "percent") {
        const percentOff = Math.min(
          Math.max(Number(discountResult.promoValue ?? 0), 0),
          100
        );
        if (percentOff > 0) {
          const coupon = await stripe.coupons.create({
            percent_off: percentOff,
            duration: "once",
          });
          couponId = coupon.id;
        }
      } else {
        const amountOffCents = Math.round(Number(discountResult.discount) * 100);
        if (amountOffCents > 0) {
          const coupon = await stripe.coupons.create({
            amount_off: amountOffCents,
            currency,
            duration: "once",
          });
          couponId = coupon.id;
        }
      }
    }

    const shouldWaiveShipping =
      discountResult.valid &&
      discountResult.promoType === "shipping" &&
      shippingCents > 0;

    const stripeLineItems = lineItems.map((item) => ({
      price_data: {
        currency,
        product_data: { name: item.name },
        unit_amount: item.unitAmountCents,
      },
      quantity: item.quantity,
    }));

    if (!shouldWaiveShipping && shippingCents > 0) {
      stripeLineItems.push({
        price_data: {
          currency,
          product_data: { name: "Shipping" },
          unit_amount: shippingCents,
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      line_items: stripeLineItems,
      mode: "payment",
      success_url:
        sanitizeRelativeOrAbsoluteUrl(
          successUrl || `${getBaseUrl(request)}/checkout/success`
        ) || `${getBaseUrl(request)}/checkout/success`,
      cancel_url:
        sanitizeRelativeOrAbsoluteUrl(
          cancelUrl || `${getBaseUrl(request)}/checkout/cancel`
        ) || `${getBaseUrl(request)}/checkout/cancel`,
      ...(couponId ? { discounts: [{ coupon: couponId }] } : {}),
      ...(shouldWaiveShipping
        ? {
            shipping_options: [
              {
                shipping_rate_data: {
                  type: "fixed_amount",
                  display_name: "Free Shipping",
                  fixed_amount: { amount: 0, currency },
                },
              },
            ],
          }
        : {}),
      metadata: {
        promoCode: sanitizeMultilineText(promoCode, { maxLength: 64 }) || "",
      },
    });

    return NextResponse.json({
      success: true,
      url: session.url,
      promoApplied: discountResult.valid ? discountResult : null,
    });
  } catch (error) {
    console.error("Checkout Session Error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to create checkout session" },
      { status: 500 }
    );
  }
}
