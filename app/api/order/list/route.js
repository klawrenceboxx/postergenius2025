import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import connectDB from "@/config/db";
import Order from "@/models/Order";
import "@/models/Product"; // register Product model for populate

export async function GET(request) {
  try {
    const { userId } = getAuth(request);
    if (!userId) {
      console.error("❌ Unauthorized fetch attempt");
      return NextResponse.json({ success: false, message: "Unauthorized" });
    }
    console.log("🔑 Fetching orders for user:", userId);

    await connectDB();
    console.log("✅ DB connected in list route");

    const orders = await Order.find({ userId })
      .sort({ date: -1 })
      .populate("items.product") // 👈 fetch full product docs
      .populate("address"); // 👈 fetch full address doc

    console.log("📦 Orders found:", orders.length);

    console.log("=== [ORDER LIST API] END ===");
    return NextResponse.json({ success: true, orders });
  } catch (error) {
    console.error("❌ ERROR in order list:", error.message, error.stack);
    return NextResponse.json({ success: false, message: error.message });
  }
}
