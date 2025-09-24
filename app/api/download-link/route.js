import mongoose from "mongoose";
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

    // before the exists() query
    const isValid = mongoose.Types.ObjectId.isValid(productId);
    const oid = isValid ? new mongoose.Types.ObjectId(productId) : null;

    console.log("[DL] userId:", userId);
    console.log("[DL] productId (query):", productId);
    console.log("[DL] oid valid?:", mongoose.Types.ObjectId.isValid(productId));
    const match = await Order.findOne({
      userId,
      $or: [
        { "items.product": productId },
        ...(mongoose.Types.ObjectId.isValid(productId)
          ? [{ "items.product": new mongoose.Types.ObjectId(productId) }]
          : []),
      ],
    }).lean();
    console.log("[DL] matched order? ", !!match, " orderId:", match?._id);

    // check purchase (handles new ObjectId orders AND legacy string orders)
    const orderExists = await Order.exists({
      userId,
      $or: [
        ...(oid ? [{ "items.product": oid }] : []),
        { "items.product": productId }, // legacy string
      ],
    });

    if (!orderExists) {
      return NextResponse.json(
        { success: false, message: "Purchase not found" },
        { status: 403 }
      );
    }

    // 5️⃣ Fetch product to get matching S3 key (using product.name as key)
    const product = await Product.findById(oid ?? productId);
    if (!product) {
      return NextResponse.json(
        { success: false, message: "Product file not found" },
        { status: 404 }
      );
    }

    let key = product.digitalFileKey || null;
    if (!key && product.digitalFileUrl) {
      try {
        const parsed = new URL(product.digitalFileUrl);
        key = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
      } catch (error) {
        console.warn("Failed to parse digital file url", error);
      }
    }

    if (!key) {
      return NextResponse.json(
        { success: false, message: "Product file not available" },
        { status: 404 }
      );
    }

    const downloadName =
      product.digitalFileName || product.name || "digital-download";

    // 6️⃣ Generate signed URL from S3
    const url = await getDownloadUrl(key, { downloadName });

    if (!url) {
      return NextResponse.json(
        { success: false, message: "Unable to generate download link" },
        { status: 500 }
      );
    }

    // ⚠️ TODO: Upgrade download logic later
    //
    // Current code assumes product.name === S3 key (fragile).
    //
    // New code adds support for:
    //  1. digitalFileKey → true S3 object key (needed for signed URLs). => fileKey is how s3 identifies files. if you give this name to s3 it will locate the file within itself.
    //  2. digitalFileUrl → fallback if only a full URL was saved. => if your bucket was public you could put this url in the browser and return this
    //  3. digitalFileName → nice filename shown to the customer when downloading. => when the customer downloads the file this is the name they will see
    //  4. Better error handling if no file is linked.
    //  5. Decouples product name from S3 key (you can rename products without breaking downloads).
    //  6. Supports multiple file types (PDF, ZIP, etc.).
    //
    // Keep this in mind when merging new code → don't rely on product.name for file lookup.

    return NextResponse.json({ success: true, url });
  } catch (error) {
    console.error("Download link error:", error);
    return NextResponse.json({ success: false, message: error.message });
  }
}
