import { NextResponse } from "next/server";

export async function POST() {
  if (!process.env.PRINTFUL_API_KEY) {
    return NextResponse.json(
      { error: "PRINTFUL_API_KEY is not configured." },
      { status: 500 }
    );
  }

  // === Static test order data ===
  const orderData = {
    external_id: "static-test-005",
    shipping: "STANDARD",
    recipient: {
      name: "Test User",
      address1: "123 Example Street",
      city: "Toronto",
      state_code: "ON",
      country_code: "CA",
      zip: "M5V1E3",
      email: "test@example.com",
    },
    items: [
      {
        variant_id: 3876, // ✅ Numeric ID for 12x18 Enhanced Matte Paper Poster
        quantity: 1,
        name: "Cool Lionee Poster (12×18)",
        files: [
          {
            type: "default",
            url: "https://d1mhf9senw3mzj.cloudfront.net/products/user_3340Zm2wcQlksBOgDX3hMuoI1y6/1758806593225-13dd171d-6e35-4bf2-9da9-f2eb051ad352.jpg",
          },
        ],
      },
    ],
  };

  try {
    const response = await fetch("https://api.printful.com/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
        "X-PF-Store-Id": "16958262", // ✅ Add your actual store ID here
      },
      body: JSON.stringify(orderData),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Printful 400 Response:", data); // 👈 add here
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
