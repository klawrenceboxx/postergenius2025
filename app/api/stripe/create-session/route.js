import Stripe from "stripe";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import connectDB from "@/config/db";
import Product from "@/models/Product";
import { computePricing } from "@/lib/pricing";

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

    const { items, address, successUrl, cancelUrl } = await request.json();
    console.log("📦 Items received:", JSON.stringify(items, null, 2));
    console.log("🏠 Address received:", address);

    if (!items || items.length === 0 || !address) {
      console.error("❌ Invalid data provided");
      return NextResponse.json({ success: false, message: "Invalid data" });
    }

    await connectDB();
    console.log("✅ DB connected");

    // Build line items + calculate totals
    const lineItems = [];
    let cartTotal = 0;
    for (const item of items) {
      const product = await Product.findById(item.productId).lean();
      if (!product) {
        console.warn("⚠️ Product not found for ID:", item.productId);
        continue;
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

    let responseData;
    if (cartTotal > 50000) {
      console.log("➡️ Creating Payment Intent (large order)...");
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(cartTotal * 100),
        currency: "usd",
        metadata: {
          userId,
          address,
          items: JSON.stringify(items),
        },
      });
      console.log("✅ Payment Intent created:", paymentIntent.id);

      responseData = {
        type: "payment_intent",
        clientSecret: paymentIntent.client_secret,
      };
    } else {
      console.log("➡️ Creating Checkout Session...");
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: lineItems,
        success_url: successUrl || process.env.STRIPE_SUCCESS_URL,
        cancel_url: cancelUrl || process.env.STRIPE_CANCEL_URL,
        metadata: {
          userId,
          address,
          // ✅ include format/dimensions for fulfillment context
          items: JSON.stringify(
            items.map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
              format: i.format ?? null,
              dimensions: i.dimensions ?? null,
            }))
          ),
        },
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
