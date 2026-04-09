import connectDB from "@/config/db";
import Order from "@/models/Order";
import {
  parseWebhook,
  mapPrintfulStatus,
  extractTrackingFromPrintful,
} from "@/lib/printful";
import { appendOrderLog } from "@/lib/order-logs";
import { sendCustomOmnisendEvent } from "@/lib/omnisend";
import { buildOrderLookupNumber } from "@/lib/orderAccess";

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
    ...(tracking?.trackingNumber ? { trackingNumber: tracking.trackingNumber } : {}),
    ...(tracking?.carrier ? { trackingCarrier: tracking.carrier } : {}),
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

  const customEventName =
    type === "package_shipped"
      ? "postergenius_order_shipped"
      : type === "package_delivered"
      ? "postergenius_order_delivered"
      : type === "order_failed"
      ? "postergenius_order_fulfillment_failed"
      : type === "order_canceled"
      ? "postergenius_order_canceled"
      : null;

  if (customEventName && order.customerEmail) {
    try {
      const orderNumber = buildOrderLookupNumber(order._id);
      const result = await sendCustomOmnisendEvent({
        email: order.customerEmail,
        eventName: customEventName,
        properties: {
          orderId: String(order._id),
          orderNumber,
          stripeSessionId: order.stripeSessionId || undefined,
          printfulOrderId: printfulOrderId || order.printfulOrderId || undefined,
          status,
          trackingUrl: tracking?.trackingUrl || order.trackingUrl || undefined,
          trackingNumber:
            tracking?.trackingNumber || order.trackingNumber || undefined,
          trackingCarrier:
            tracking?.carrier || order.trackingCarrier || undefined,
        },
      });

      if (result.sent) {
        await appendOrderLog(
          order._id,
          "omnisend_shipping_event_sent",
          `Sent Omnisend event ${customEventName}.`
        );
      }
    } catch (omnisendError) {
      await appendOrderLog(
        order._id,
        "omnisend_shipping_event_failed",
        `Omnisend shipping event failed: ${omnisendError.message}`
      );
      console.error("[Printful] Failed to send Omnisend status event", omnisendError);
    }
  }

  return {
    status: "order_updated",
    type,
    orderId: order._id,
    update,
  };
}
