import { NextResponse } from "next/server";
import connectDB from "@/config/db";
import Product from "@/models/Product";

export async function GET() {
  try {
    await connectDB();

    const products = await Product.find({
      $or: [
        { isPrintfulEnabled: true },
        { printfulEnabled: true },
        { PrintfulEnabled: true },
      ],
    })
      .select("name printfulVariantIds isPrintfulEnabled printfulEnabled")
      .lean();

    const mapped = (products || []).map((product) => ({
      id: product._id?.toString?.() || product._id || product.id,
      name: product.name,
      isPrintfulEnabled: Boolean(
        product.isPrintfulEnabled ??
          product.printfulEnabled ??
          product.PrintfulEnabled
      ),
      printfulVariantIds: {
        small_12x18: product.printfulVariantIds?.small_12x18 ?? null,
        medium_18x24: product.printfulVariantIds?.medium_18x24 ?? null,
        large_24x36: product.printfulVariantIds?.large_24x36 ?? null,
      },
    }));

    return NextResponse.json({ success: true, products: mapped });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
