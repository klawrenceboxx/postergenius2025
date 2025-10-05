import Order from "@/models/Order";

export function buildLogEntry(type, message, timestamp = new Date()) {
  return {
    type,
    message,
    timestamp,
  };
}

export async function appendOrderLog(orderId, type, message) {
  if (!orderId || !type || !message) {
    return;
  }

  const entry = buildLogEntry(type, message);

  await Order.updateOne(
    { _id: orderId },
    {
      $push: { orderLogs: entry },
    }
  );
}
