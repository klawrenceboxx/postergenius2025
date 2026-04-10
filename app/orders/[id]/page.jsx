import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import connectDB from "@/config/db";
import Order from "@/models/Order";
import "@/models/Product";
import "@/models/Address";
import OrderDetailClient from "./OrderDetailClient";
import {
  buildOrderLookupNumber,
  isOrderLookupTokenValid,
} from "@/lib/orderAccess";
import { sanitizeIdentifier } from "@/lib/security/input";

async function getOrderForRequest(orderId, userId, token) {
  await connectDB();

  const order = await Order.findById(orderId)
    .populate("items.product")
    .populate("digitalDownloads.product")
    .populate("address")
    .lean();

  if (!order) {
    return null;
  }

  const signedInOwner = Boolean(userId && order.userId === userId);
  const validGuestToken = Boolean(token && isOrderLookupTokenValid(order, token));

  if (!signedInOwner && !validGuestToken) {
    return null;
  }

  return JSON.parse(
    JSON.stringify({
      ...order,
      _id: order._id.toString(),
      orderNumber: buildOrderLookupNumber(order._id),
      guestLookupTokenExpiresAt: order.guestLookupTokenExpiresAt
        ? new Date(order.guestLookupTokenExpiresAt).toISOString()
        : null,
    })
  );
}

export default async function OrderDetailPage({ params, searchParams }) {
  const { userId } = await auth();
  const orderId = sanitizeIdentifier(params?.id, { maxLength: 64 });
  const token = sanitizeIdentifier(searchParams?.token, { maxLength: 128 });

  if (!orderId) {
    notFound();
  }

  const order = await getOrderForRequest(orderId, userId, token);
  if (!order) {
    notFound();
  }

  return <OrderDetailClient order={order} accessToken={token || null} />;
}
