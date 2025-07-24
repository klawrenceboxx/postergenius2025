import Stripe from "stripe";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import connectDB from "@/config/db";
import Product from "@/models/Product";
import { inngest } from "@/config/inngest";
import User from "@/models/User";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  try {
    const auth = getAuth(request);
    if (!auth.userId)
      return NextResponse.json({ success: false, message: "Unauthorized" });
    const userId = auth.userId;
    // check to see if user is authtenticated first

    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ success: false, message: "Missing session" });
    }

    await connectDB();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return NextResponse.json({
        success: false,
        message: "Payment incomplete",
      });
    }

    const items = JSON.parse(session.metadata.items);
    const address = session.metadata.address;

    let amount = 0;
    if (!items || !Array.isArray(items) || !address) {
      return NextResponse.json({ success: false, message: "Invalid metadata" });
    }
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) throw new Error("Product not found");
      amount += product.offerPrice * item.quantity;
    }
    // checks to make sure metadata exists, like items and address, as well as prodcuts
    // uses a for loop to avoid promise chaining that you get with reduce + async

    await inngest.send({
      name: "order/created",
      data: {
        userId,
        address,
        items,
        amount: amount + Math.floor(amount * 0.13),
        date: Date.now(),
      },
    });

    const user = await User.findById(userId);
    user.cartItems = [];
    await user.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: error.message });
  }
}
