import connectDB from "@/config/db";
import authAdmin from "@/lib/authAdmin";
import "@/models/Address";
import Order from "@/models/Order";
import "@/models/Product";
import { clerkClient, getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { userId } = getAuth(request);

    const isAdmin = await authAdmin(userId);

    if (!isAdmin) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const orders = await Order.find({})
      .sort({ date: -1, createdAt: -1 })
      .populate("address")
      .populate({ path: "items.product", model: "product" });

    const client = await clerkClient();
    const userCache = new Map();

    const enrichedOrders = await Promise.all(
      orders.map(async (order) => {
        const snapshot = order.shippingAddressSnapshot || {};
        const address = order.address || {};

        let buyerName =
          snapshot.fullName ||
          address.fullName ||
          null;
        let buyerEmail = snapshot.email || null;

        if (order.userId) {
          let clerkUser = userCache.get(order.userId);

          if (clerkUser === undefined) {
            try {
              clerkUser = await client.users.getUser(order.userId);
            } catch {
              clerkUser = null;
            }

            userCache.set(order.userId, clerkUser);
          }

          if (clerkUser) {
            const primaryEmail =
              clerkUser.emailAddresses?.find(
                (email) => email.id === clerkUser.primaryEmailAddressId
              )?.emailAddress ||
              clerkUser.emailAddresses?.[0]?.emailAddress ||
              null;

            buyerName =
              buyerName ||
              [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
              clerkUser.username ||
              null;
            buyerEmail = buyerEmail || primaryEmail;
          }
        }

        const serializedOrder = order.toObject();

        return {
          ...serializedOrder,
          buyer: {
            name: buyerName,
            email: buyerEmail,
          },
        };
      })
    );

    return NextResponse.json({ success: true, orders: enrichedOrders });
  } catch (error) {
    console.error("[seller-orders] Failed to load seller orders:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load orders" },
      { status: 500 }
    );
  }
}
