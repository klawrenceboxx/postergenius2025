import { NextResponse } from "next/server";
import connectDB from "@/config/db";
import Product from "@/models/Product";
import { toCdnUrl } from "@/lib/cdn";

export async function POST() {
  try {
    await connectDB();
    const products = await Product.find();

    let updatedCount = 0;

    for (const product of products) {
      // Use either s3Url or digitalFileUrl
      const s3Candidate = product.s3Url || product.digitalFileUrl;
      if (!s3Candidate) continue;

      const cdnUrl = toCdnUrl(s3Candidate);

      // Skip if no conversion or already up-to-date
      if (!cdnUrl || cdnUrl === product.cdnUrl) continue;

      // Backfill new fields
      product.s3Url = s3Candidate;
      product.cdnUrl = cdnUrl;

      await product.save();
      updatedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `✅ Updated ${updatedCount} products with new CloudFront URLs.`,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

// Run it

// Start your dev server (npm run dev)

// Then hit this route in your browser or Postman:

// POST http://localhost:3000/api/utils/migrate-cdn

// Check console / DB logs
// You’ll see which products were updated, and they’ll now include cdnUrl.
