import { NextResponse } from "next/server";
import Stripe from "stripe";
import connectDB from "@/config/db";
import Order from "@/models/Order";
import {
  buildPhysicalItems,
  formatRecipientFromAddress,
  createPrintfulOrder,
} from "@/lib/printful";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

function extractMetadata(event) {
  const payload = event?.data?.object || {};
  return payload.metadata || {};
}

function getOrderIdFromMetadata(metadata = {}) {
  return (
    metadata.orderId ||
    metadata.order_id ||
    metadata.order ||
    metadata.localOrderId ||
    metadata.local_order_id ||
    null
  );
}

function snapshotToItems(snapshot) {
  if (!snapshot) return [];
  if (Array.isArray(snapshot)) return snapshot;
  if (typeof snapshot === "object") {
    return Object.values(snapshot);
  }
  return [];
}

async function submitPrintfulOrder(order) {
  let itemsForPrintful;
  try {
    itemsForPrintful = await buildPhysicalItems(
      snapshotToItems(order.cartSnapshot)
    );
  } catch (err) {
    console.error("[Printful] Failed", err?.message, err?.details || "");
    await Order.findByIdAndUpdate(order._id, {
      printfulStatus: "Fulfillment Failed",
      printfulError: err?.message,
    });
    return;
  }

  if (itemsForPrintful.length === 0) {
    console.log("[Printful] No physical items to fulfill", {
      localOrderId: order._id.toString(),
    });
    return;
  }

  let recipient;
  try {
    recipient = formatRecipientFromAddress(order.shippingAddressSnapshot, {
      fallbackCountry: "CA",
    });
  } catch (err) {
    console.error("[Printful] Failed", err?.message, err?.details || "");
    await Order.findByIdAndUpdate(order._id, {
      printfulStatus: "Fulfillment Failed",
      printfulError: err?.message,
    });
    return;
  }

  try {
    const pfOrder = await createPrintfulOrder({
      shipping: "STANDARD",
      recipient,
      items: itemsForPrintful,
      external_id: order._id.toString(),
    });

    console.log("[Printful] Order created", {
      local: order._id.toString(),
      printful: pfOrder?.id,
    });

    await Order.findByIdAndUpdate(order._id, {
      printfulStatus: "Submitted",
      printfulOrderId: pfOrder?.id,
    });
  } catch (err) {
    console.error("[Printful] Failed", err?.message, err?.details || "");
    await Order.findByIdAndUpdate(order._id, {
      printfulStatus: "Fulfillment Failed",
      printfulError: err?.message,
    });
  }
}

export async function POST(req) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("❌ Webhook signature verification failed:", err.message);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 400 }
    );
  }

  try {
    if (
      event.type === "checkout.session.completed" ||
      event.type === "payment_intent.succeeded"
    ) {
      const metadata = extractMetadata(event);
      const localOrderId = getOrderIdFromMetadata(metadata);

      if (!localOrderId) {
        console.error(
          "[Printful] Missing orderId in Stripe metadata",
          metadata
        );
      } else {
        await connectDB();

        const order = await Order.findById(localOrderId).lean();
        if (!order) {
          console.error("[Printful] No local order to fulfill", {
            localOrderId,
          });
        } else {
          await submitPrintfulOrder(order);
        }
      }
    }
  } catch (err) {
    console.error("❌ ERROR processing webhook:", err?.message || err);
    return NextResponse.json(
      { success: false, message: "Webhook processing error" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
