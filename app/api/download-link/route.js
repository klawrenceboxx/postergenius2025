import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import connectDB from "@/config/db";
import Order from "@/models/Order";
import { getDownloadUrl } from "@/lib/s3";

export async function GET(request) {
  try {
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    if (!productId) {
      return NextResponse.json({ success: false, message: "Missing productId" }, { status: 400 });
    }

    await connectDB();

    const orderExists = await Order.exists({
      userId,
      "items.product": productId,
    });

    if (!orderExists) {
      return NextResponse.json({ success: false, message: "Purchase not found" }, { status: 403 });
    }

    const url = await getDownloadUrl(`${productId}.zip`);

    return NextResponse.json({ success: true, url });
  } catch (error) {
    console.error("Download link error:", error);
    return NextResponse.json({ success: false, message: error.message });
  }
}
