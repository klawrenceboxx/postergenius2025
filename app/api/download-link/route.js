import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import connectDB from "@/config/db";
import Order from "@/models/Order";
import Product from "@/models/Product";
import { getDownloadUrl } from "@/lib/s3";

export async function GET(request) {
  try {
    // 1️⃣ Authenticate user
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2️⃣ Extract productId from query params
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    if (!productId) {
      return NextResponse.json(
        { success: false, message: "Missing productId" },
        { status: 400 }
      );
    }

    // 3️⃣ Connect to database
    await connectDB();

    // 4️⃣ Check if user purchased this product
    const orderExists = await Order.exists({
      userId,
      "items.product": productId,
    });

    if (!orderExists) {
      return NextResponse.json(
        { success: false, message: "Purchase not found" },
        { status: 403 }
      );
    }

    // 5️⃣ Fetch product to get matching S3 key (using product.name as key)
    const product = await Product.findById(productId);
    if (!product || !product.name) {
      return NextResponse.json(
        { success: false, message: "Product file not found" },
        { status: 404 }
      );
    }

    // 6️⃣ Generate signed URL from S3 (name matches S3 key)
    const url = await getDownloadUrl(product.name);
    // change later to accept zips

    return NextResponse.json({ success: true, url });
  } catch (error) {
    console.error("Download link error:", error);
    return NextResponse.json({ success: false, message: error.message });
  }
}
