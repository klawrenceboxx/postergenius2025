import Stripe from "stripe";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  try {
    // Check authentication
    const auth = getAuth(request);
    if (!auth.userId) {
      return NextResponse.json({
        success: false,
        message: "Unauthorized",
      });
    }

    // Get and validate session ID
    const { sessionId } = await request.json();
    if (!sessionId) {
      return NextResponse.json({
        success: false,
        message: "Missing session ID",
      });
    }

    // Verify payment status
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") {
      return NextResponse.json({
        success: false,
        message: "Payment not completed",
      });
    }

    // Return success if payment is confirmed
    return NextResponse.json({
      success: true,
      message: "Payment confirmed",
    });
  } catch (error) {
    console.error("Payment confirmation error:", error);
    return NextResponse.json({
      success: false,
      message: error.message || "Failed to confirm payment",
    });
  }
}
