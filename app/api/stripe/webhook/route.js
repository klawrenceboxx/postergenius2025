import { NextResponse } from "next/server";
import Stripe from "stripe";
import connectDB from "@/config/db";
import Order from "@/models/Order";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

export async function POST(req) {
  console.log("=== [STRIPE WEBHOOK] START ===");
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    console.log("📩 Stripe Event:", event.type);
  } catch (err) {
    console.error("❌ Webhook signature verification failed:", err.message);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 400 }
    );
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const metadata = session.metadata || {};
      console.log("✅ checkout.session.completed, metadata:", metadata);

      // parse and remap items: { product: <id>, quantity: <n> }
      let incoming = [];
      try {
        incoming = JSON.parse(metadata.items || "[]");
      } catch (e) {
        console.warn("⚠️ Failed to parse metadata.items, defaulting to []");
        incoming = [];
      }

      const items = incoming.map((it) => ({
        product: it.productId || it.product,
        quantity: Number(it.quantity || 0),
      }));

      await connectDB();
      console.log("✅ DB connected in webhook");

      // prevent duplicate orders for same Stripe session
      const existing = await Order.findOne({ stripeSessionId: session.id });
      if (existing) {
        console.log(
          "ℹ️ Order already exists for session:",
          session.id,
          "orderId:",
          existing._id
        );
        return NextResponse.json({ received: true });
      }

      const subtotal = (session.amount_subtotal || 0) / 100;
      const amount = (session.amount_total || 0) / 100;
      const tax = amount - subtotal;

      const newOrder = new Order({
        userId: metadata.userId,
        address: (() => {
          try {
            return JSON.parse(metadata.address || "null");
          } catch {
            return metadata.address || null;
          }
        })(),
        items,
        subtotal,
        tax,
        amount,
        date: new Date(),
        stripeSessionId: session.id,
      });

      await newOrder.save();
      console.log("📝 Order saved:", newOrder._id);
    }
  } catch (err) {
    console.error("❌ ERROR processing webhook:", err?.message || err);
    return NextResponse.json(
      { success: false, message: "Webhook processing error" },
      { status: 500 }
    );
  }

  console.log("=== [STRIPE WEBHOOK] END ===");
  return NextResponse.json({ received: true });
}
