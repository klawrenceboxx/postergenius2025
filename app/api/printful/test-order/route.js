import { NextResponse } from "next/server";
import connectDB from "@/config/db";
import Order from "@/models/Order";
import Address from "@/models/Address";
import { formatRecipientFromAddress } from "@/lib/printful";

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

  const orderSelection = {
    _id: 1,
    shippingAddressSnapshot: 1,
    address: 1,
    items: 1,
  };

  if (requestedOrderId) {
    orderDoc = await Order.findById(requestedOrderId)
      .select(orderSelection)
      .lean();
    if (!orderDoc) {
      return NextResponse.json(
        { error: `Order ${requestedOrderId} was not found.` },
        { status: 404 }
      );
    }
  } else {
    orderDoc = await Order.findOne({}, orderSelection, { sort: { createdAt: -1 } }).lean();
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

  let shippingAddress = orderDoc.shippingAddressSnapshot;

  if (!shippingAddress && orderDoc.address) {
    const addressDoc = await Address.findById(orderDoc.address).lean();
    if (addressDoc) {
      shippingAddress = addressDoc;
    }
  }

  if (!shippingAddress) {
    return NextResponse.json(
      {
        error:
          "The selected order does not include a shipping address. Please update the order and try again.",
      },
      { status: 400 }
    );
  }

  let recipient;
  try {
    recipient = formatRecipientFromAddress(shippingAddress);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to format shipping address for Printful.",
      },
      { status: 400 }
    );
  }

  // === Build test order data ===
  const selectedItem = orderDoc.items?.find(
    (item) => typeof item?.printfulVariantId !== "undefined"
  );

  if (
    !selectedItem ||
    selectedItem.printfulVariantId === null ||
    selectedItem.printfulVariantId === ""
  ) {
    return NextResponse.json(
      {
        error:
          "The selected order does not include an item with a Printful variant ID.",
      },
      { status: 400 }
    );
  }

  const orderData = {
    external_id: externalId,
    shipping: "STANDARD",
    recipient,
    items: [
      {
        variant_id: selectedItem.printfulVariantId,
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
