import connectDB from "@/config/db";
import authAdmin from "@/lib/authAdmin";
import "@/models/Address";
import Order from "@/models/Order";
import "@/models/Product";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { userId } = getAuth(request);

    const isAdmin = await authAdmin(userId);

    if (!isAdmin) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const orders = await Order.find({})
      .sort({ date: -1, createdAt: -1 })
      .populate("address")
      .populate({ path: "items.product", model: "product" });

    return NextResponse.json({ success: true, orders });
  } catch (error) {
    console.error("[seller-orders] Failed to load seller orders:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load orders" },
      { status: 500 }
    );
  }
}
