import Product from "@/models/Product";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import connectDB from "@/config/db";
import { inngest } from "@/config/inngest";
import User from "@/models/User";

export async function POST(request) {
  try {
    const { userId } = getAuth(request);
    const { address, items } = await request.json();

    if (!address || !items.length === 0) {
      return NextResponse.json({ success: false, message: "Invalid data" });
    }

    // calculate amount using items
    const amount = await items.reduce(async (acc, item) => {
      const product = await Product.findById(item.product);
      return acc + product.offerPrice * item.quantity;
    }, 0);

    await inngest.send({
      name: "Order Created",
      data: {
        userId,
        address,
        items,
        amount: amount + Math.floor(amount * 0.13), // adding 13% tax
        date: Date.now(),
      },
    });

    // clear user cart
    const user = await User.findById(userId);
    user.cartItems = [];
    await user.save();

    return NextResponse.json({
      success: true,
      message: "Order Created Successfully",
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message });
  }
}
