// src/app/api/stripe/webhook/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import mongoose from "mongoose";
import connectDB from "@/config/db";
import Product from "@/models/Product";
import User from "@/models/User";
import { inngest } from "@/config/inngest";
import Order from "@/models/Order";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2022-11-15",
});

export async function POST(request) {
  const sig = request.headers.get("stripe-signature");
  let event;

  try {
    const body = await request.text();
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

      // Check if order already exists for this session
      const existingOrder = await Order.findOne({
        stripeSessionId: session.id,
      });

      if (existingOrder) {
        console.log("Order already exists for session:", session.id);
        return NextResponse.json({ received: true });
      }

      const userId = session.metadata?.userId || "";
      const guestId = session.metadata?.guestId || "";
      const addressData = session.metadata?.address;
      const items = JSON.parse(session.metadata?.items || "[]");

      const isValidAddress = mongoose.Types.ObjectId.isValid(addressData);

      // Calculate totals
      let cartTotal = 0;
      for (const item of items) {
        const product = await Product.findById(item.product);
        if (!product) continue;
        cartTotal += product.offerPrice * item.quantity;
      }
      const subtotal = cartTotal;
      const tax = Number((subtotal * 0.13).toFixed(2));
      const total = Number((subtotal + tax).toFixed(2));

      if (!isValidAddress) {
        const guestAddress = JSON.parse(addressData || "{}");
        guestAddress.email =
          session.customer_details?.email || session.customer_email || "";

        await Order.create({
          guestId: guestId || `guest_${session.id}`,
          guestAddress,
          items,
          subtotal,
          tax,
          amount: total,
          date: Date.now(),
          stripeSessionId: session.id,
        });
        return NextResponse.json({ received: true });
      }

      // Trigger order event for logged-in users
      await inngest.send({
        name: "order/created",
        data: {
          userId,
          address: addressData,
          items,
          subtotal,
          tax,
          amount: total,
          date: Date.now(),
          stripeSessionId: session.id,
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
