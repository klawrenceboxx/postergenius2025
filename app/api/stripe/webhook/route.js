// src/app/api/stripe/webhook/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import connectDB from "@/config/db";
import Product from "@/models/Product";
import User from "@/models/User";
import { inngest } from "@/config/inngest";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2022-11-15",
});

export async function POST(request) {
  const sig = request.headers.get("stripe-signature");
  let event;

  try {
    console.log("✅ Received Stripe webhook");
    console.log("Headers:", Object.fromEntries(request.headers.entries()));

    const body = await request.text();
    console.log("Raw body:", body);

    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || ""
    );
  } catch (err) {
    console.error("Webhook Error:", err.message);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    try {
      await connectDB();

      const userId = session.metadata?.userId;
      const address = session.metadata?.address;
      const items = JSON.parse(session.metadata?.items || "[]");

      // Calculate total
      let cartTotal = 0;
      for (const item of items) {
        const product = await Product.findById(item.product);
        if (!product) continue;
        cartTotal += product.offerPrice * item.quantity;
      }
      const tax = Math.floor(cartTotal * 0.13);
      const total = cartTotal + tax;

      // Trigger order event
      await inngest.send({
        name: "order/created",
        data: {
          userId,
          address,
          items,
          amount: total,
          date: Date.now(),
        },
      });

      // Clear cart
      const user = await User.findById(userId);
      if (user) {
        user.cartItems = [];
        await user.save();
      }
    } catch (err) {
      console.error("Error processing order:", err.message);
      return new NextResponse(`Webhook Processing Error`, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
