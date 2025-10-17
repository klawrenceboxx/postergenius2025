import { NextResponse } from "next/server";

export async function GET() {
  try {
    // 1️⃣ Check API key
    if (!process.env.PRINTFUL_API_KEY) {
      return NextResponse.json(
        { error: "PRINTFUL_API_KEY not found in environment variables." },
        { status: 500 }
      );
    }

    // 2️⃣ Set your product_id for Enhanced Matte Paper Poster (in)
    // Find this by checking Printful’s product catalog endpoint or docs.
    const productId = 1; // Example only — replace with the real one from Printful catalog

    // 3️⃣ Call Printful API to get product info
    const res = await fetch(`https://api.printful.com/products/${productId}`, {
      headers: {
        Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
      },
    });

    // 4️⃣ Handle API errors
    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json(
        { error: `Failed to fetch variants. ${errorText}` },
        { status: res.status }
      );
    }

    // 5️⃣ Parse response
    const data = await res.json();
    const variants = data.result.variants.map((v) => ({
      id: v.id,
      size: v.size,
      color: v.color,
      name: v.name,
    }));

    // 6️⃣ Return clean variant list
    return NextResponse.json({ productId, variants });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Unknown error" },
      { status: 500 }
    );
  }
}
