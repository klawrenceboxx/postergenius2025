import Stripe from "stripe";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import connectDB from "@/config/db";
import Product from "@/models/Product";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  try {
    const auth = getAuth(request);
    if (!auth.userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" });
    }
    const userId = auth.userId;
    const { items, address, successUrl, cancelUrl } = await request.json(); // ✅ FIXED

    if (!items || items.length === 0 || !address) {
      return NextResponse.json({ success: false, message: "Invalid data" });
    }

    await connectDB();

    const products = await Promise.all(
      items.map(async (item) => {
        const product = await Product.findById(item.product);
        return product.offerPrice * item.quantity;
      })
    );
    const amount = products.reduce((acc, val) => acc + val, 0);
    //replace reduce and aync with promise.all to parallelize DB reads

    const origin = new URL(request.url).origin;

    const lineItems = [];
    let cartTotal = 0;
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) continue;
      const subtotal = product.offerPrice * item.quantity;
      cartTotal += subtotal;
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: { name: product.name },
          unit_amount: Math.round(product.offerPrice * 100),
        },
        quantity: item.quantity,
      });
    }

    const subtotal = cartTotal;
    const tax = parseFloat((subtotal * 0.13).toFixed(2));
    const total = subtotal + tax;
    let responseData;
    if (cartTotal > 50000) {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(cartTotal * 100),
        currency: "usd",
        metadata: {
          userId,
          address: JSON.stringify(address), // <-- CHANGED (added!)
          items: JSON.stringify(items), // <-- CHANGED (added!)
        },
      });
      responseData = {
        type: "payment_intent",
        clientSecret: paymentIntent.client_secret,
      };
    } else {
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: lineItems,
        success_url: successUrl || process.env.STRIPE_SUCCESS_URL,
        cancel_url: cancelUrl || process.env.STRIPE_CANCEL_URL,
        metadata: {
          userId,
          address: JSON.stringify(address), // <-- CHANGED (added!)
          items: JSON.stringify(items), // <-- CHANGED (added!)
        },
      });
      responseData = {
        type: "checkout_session",
        sessionId: session.id,
        url: session.url,
      };
    }

    return NextResponse.json({ success: true, ...responseData });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: error.message });
  }
}
