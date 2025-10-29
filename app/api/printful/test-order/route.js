import { NextResponse } from "next/server";
import connectDB from "@/config/db";
import Order from "@/models/Order";

export async function POST(request) {
  if (!process.env.PRINTFUL_API_KEY) {
    return NextResponse.json(
      { error: "PRINTFUL_API_KEY is not configured." },
      { status: 500 }
    );
  }

  await connectDB();

  let requestedOrderId = null;
  if (request?.bodyUsed !== true) {
    try {
      const payload = await request.json();
      if (payload && typeof payload.orderId === "string") {
        requestedOrderId = payload.orderId.trim();
      }
    } catch (error) {
      // Swallow JSON parsing errors – callers may legitimately send an empty body.
    }
  }

  let orderDoc = null;

  if (requestedOrderId) {
    orderDoc = await Order.findById(requestedOrderId).select("_id").lean();
    if (!orderDoc) {
      return NextResponse.json(
        { error: `Order ${requestedOrderId} was not found.` },
        { status: 404 }
      );
    }
  } else {
    orderDoc = await Order.findOne({}, { _id: 1 }, { sort: { createdAt: -1 } }).lean();
    if (!orderDoc) {
      return NextResponse.json(
        {
          error:
            "No orders are available to use as an external ID. Create an order and try again.",
        },
        { status: 404 }
      );
    }
  }

  const externalId = orderDoc._id.toString();

  // === Static test order data ===
  const orderData = {
    external_id: externalId,
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
