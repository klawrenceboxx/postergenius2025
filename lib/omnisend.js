function getOmnisendApiKey() {
  return process.env.OMNISEND_API_KEY || "";
}

function getOmnisendHeaders() {
  const apiKey = getOmnisendApiKey();
  if (!apiKey) {
    return null;
  }

  return {
    "Content-Type": "application/json",
    "X-API-KEY": apiKey,
  };
}

function buildLineItem(item = {}) {
  return {
    productID:
      item.productID ||
      item.productId ||
      item.id ||
      item._id ||
      item.slug ||
      "unknown-product",
    productTitle: item.productTitle || item.name || item.title || "Poster",
    productPrice: Number(item.productPrice ?? item.price ?? item.unitPrice ?? 0),
    quantity: Number(item.quantity ?? 1),
    productImageURL: item.productImageURL || item.imageUrl || item.image || undefined,
    productURL: item.productURL || item.url || undefined,
    format: item.format || undefined,
    dimensions: item.dimensions || undefined,
  };
}

async function sendOmnisendEvent(payload) {
  const headers = getOmnisendHeaders();
  if (!headers) {
    return { sent: false, reason: "omnisend_not_configured" };
  }

  const response = await fetch("https://api.omnisend.com/v5/events", {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `[omnisend] Event request failed (${response.status}): ${errorText || "Unknown error"}`
    );
  }

  return { sent: true };
}

export async function sendPlacedOrderEvent({
  email,
  phone,
  orderId,
  orderNumber,
  createdAt,
  currency = "CAD",
  totalPrice = 0,
  fulfillmentStatus = "unfulfilled",
  paymentStatus = "paid",
  lineItems = [],
  customProperties = {},
}) {
  if (!email) {
    return { sent: false, reason: "missing_email" };
  }

  return sendOmnisendEvent({
    eventName: "placed order",
    eventID: crypto.randomUUID(),
    origin: "api",
    eventVersion: "v2",
    contact: {
      email,
      ...(phone ? { phone } : {}),
    },
    properties: {
      orderID: String(orderId),
      orderNumber: orderNumber || undefined,
      createdAt: new Date(createdAt || Date.now()).toISOString(),
      currency: String(currency || "CAD").toUpperCase(),
      totalPrice: Number(totalPrice || 0),
      paymentStatus,
      fulfillmentStatus,
      lineItems: lineItems.map(buildLineItem),
      ...customProperties,
    },
  });
}

export async function sendCustomOmnisendEvent({
  email,
  phone,
  eventName,
  properties = {},
}) {
  if (!email || !eventName) {
    return { sent: false, reason: "missing_required_fields" };
  }

  return sendOmnisendEvent({
    eventName,
    eventID: crypto.randomUUID(),
    origin: "api",
    eventVersion: "",
    contact: {
      email,
      ...(phone ? { phone } : {}),
    },
    properties,
  });
}
