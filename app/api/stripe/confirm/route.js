import Stripe from "stripe";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import connectDB from "@/config/db";
import Order from "@/models/Order";
import { sanitizePlainText } from "@/lib/security/input";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function waitForOrder(sessionId, attempts = 6) {
  for (let index = 0; index < attempts; index += 1) {
    const order = await Order.findOne({ stripeSessionId: sessionId })
      .populate("items.product")
      .populate("address")
      .lean();

    if (order) {
      return order;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return null;
}

export async function POST(request) {
  try {
    const auth = getAuth(request);
    const { sessionId: rawSessionId } = await request.json();
    const sessionId = sanitizePlainText(rawSessionId, { maxLength: 128 });

    if (!sessionId) {
      return NextResponse.json({
        success: false,
        message: "Missing session ID",
      });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") {
      return NextResponse.json({
        success: false,
        message: "Payment not completed",
      });
    }

    const sessionUserId = session.metadata?.userId || null;
    if (sessionUserId && auth.userId && auth.userId !== sessionUserId) {
      return NextResponse.json(
        {
          success: false,
          message: "This order does not belong to the current signed-in user.",
        },
        { status: 403 }
      );
    }

    await connectDB();
    const order = await waitForOrder(sessionId);

    return NextResponse.json({
      success: true,
      message: "Payment confirmed",
      paid: true,
      orderReady: Boolean(order),
      orderId: order?._id?.toString?.() || null,
      guestAccessToken: order?.guestAccessToken || null,
      customerEmail:
        order?.customerEmail ||
        session.customer_details?.email ||
        session.customer_email ||
        null,
      status: order?.status || null,
    });
  } catch (error) {
    console.error("Payment confirmation error:", error);
    return NextResponse.json({
      success: false,
      message: error.message || "Failed to confirm payment",
    });
  }
}
