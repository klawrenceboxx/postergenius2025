import connectDB from "@/config/db";
import Order from "@/models/Order";
import {
  parseWebhook,
  mapPrintfulStatus,
  extractTrackingFromPrintful,
} from "@/lib/printful";
import { appendOrderLog } from "@/lib/order-logs";

function buildOrderQuery({ printfulOrderId, externalId }) {
  const orConditions = [];

  if (printfulOrderId) {
    orConditions.push({ printfulOrderId });
  }

  if (externalId) {
    if (/^[0-9a-fA-F]{24}$/.test(externalId)) {
      orConditions.push({ _id: externalId });
    }
    orConditions.push({ stripeSessionId: externalId });
  }

  if (orConditions.length === 0) {
    return null;
  }

  return { $or: orConditions };
}

export async function processPrintfulWebhook(payload) {
  const event = parseWebhook(payload);
  const type = event?.type || event?.event || "unknown";
  const payloadOrder =
    event?.data?.order ||
    event?.order ||
    event?.data?.fulfillment ||
    event?.data ||
    event?.result ||
    null;

  const printfulOrderId =
    payloadOrder?.id ||
    payloadOrder?.order_id ||
    event?.data?.order_id ||
    event?.order_id ||
    null;
  const externalId = payloadOrder?.external_id || event?.data?.external_id;

  const query = buildOrderQuery({ printfulOrderId, externalId });
  if (!query) {
    return {
      status: "order_not_identified",
      type,
    };
  }

  await connectDB();

  const order = await Order.findOne(query);
  if (!order) {
    return {
      status: "order_not_found",
      type,
      query,
    };
  }

  const tracking = extractTrackingFromPrintful(event?.data || event);
  const remoteStatus = payloadOrder?.status || event?.status || null;
  const status = mapPrintfulStatus(remoteStatus || type);

  const update = {
    printfulStatus: remoteStatus || type,
    status,
    ...(printfulOrderId ? { printfulOrderId } : {}),
    ...(tracking?.trackingUrl ? { trackingUrl: tracking.trackingUrl } : {}),
  };

  if (type === "order_failed" || type === "order_canceled") {
    update.fulfillmentError = event?.data?.reason || "Marked by Printful";
  } else if (type === "package_shipped" || type === "package_delivered") {
    update.fulfillmentError = null;
  }

  await Order.updateOne({ _id: order._id }, { $set: update });

  const logMessageParts = [
    `Printful webhook ${type}`,
    remoteStatus ? `status: ${remoteStatus}` : null,
  ]
    .filter(Boolean)
    .join(" – ");

  await appendOrderLog(order._id, "printful_webhook", logMessageParts);

  if (update.fulfillmentError) {
    await appendOrderLog(
      order._id,
      "printful_webhook_error",
      update.fulfillmentError
    );
  }

  if (tracking?.trackingUrl) {
    await appendOrderLog(
      order._id,
      "printful_tracking_updated",
      `Tracking available at ${tracking.trackingUrl}`
    );
  }

  return {
    status: "order_updated",
    type,
    orderId: order._id,
    update,
  };
}
