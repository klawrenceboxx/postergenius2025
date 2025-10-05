import crypto from "crypto";

const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;
const PRINTFUL_API_BASE =
  process.env.PRINTFUL_API_BASE?.replace(/\/$/, "") ||
  "https://api.printful.com";
const PRINTFUL_WEBHOOK_SECRET = process.env.PRINTFUL_WEBHOOK_SECRET;
const PRINTFUL_DEFAULT_COUNTRY =
  process.env.PRINTFUL_DEFAULT_COUNTRY?.toUpperCase() || "US";

const PRINTFUL_VARIANT_MAP = Object.freeze({
  "12x18": "68e1c9cb819f12",
  "18x24": "68e1c9cb819fb4",
  "24x36": "68e1c9cb81a046",
});

function ensureApiKey() {
  if (!PRINTFUL_API_KEY) {
    throw new Error("Missing PRINTFUL_API_KEY environment variable. Set it in your server environment.");
  }
}

function buildEndpoint(path, searchParams) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (!searchParams || Object.keys(searchParams).length === 0) {
    return normalizedPath;
  }

  const params = new URLSearchParams();
  Object.entries(searchParams).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    params.append(key, String(value));
  });

  const queryString = params.toString();
  return queryString ? `${normalizedPath}?${queryString}` : normalizedPath;
}

export async function printfulRequest(path, { method = "GET", body, headers, searchParams } = {}) {
  ensureApiKey();
  const endpoint = buildEndpoint(path, searchParams);
  const url = `${PRINTFUL_API_BASE}${endpoint}`;

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${PRINTFUL_API_KEY}`,
      "Content-Type": "application/json",
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  let payload = null;
  const text = await response.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch (error) {
      throw new Error(`Unexpected Printful API response: ${text}`);
    }
  }

  if (!response.ok) {
    const message = payload?.error?.message || payload?.message || `Printful API request failed with status ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.details = payload;
    throw error;
  }

  return payload?.result ?? payload;
}

export function normalizeDimensions(value) {
  if (!value) return null;
  return String(value)
    .toLowerCase()
    .replace(/×/g, "x")
    .replace(/\s+/g, "")
    .trim();
}

export function getVariantIdForSize(value) {
  const normalized = normalizeDimensions(value);
  if (!normalized) return null;
  return PRINTFUL_VARIANT_MAP[normalized] || null;
}

export function assertVariantId(value) {
  const variantId = getVariantIdForSize(value);
  if (!variantId) {
    throw new Error(
      `Unsupported Printful poster size: ${value}. Update PRINTFUL_VARIANT_MAP if new sizes are introduced.`
    );
  }
  return variantId;
}

export function formatRecipientFromAddress(address = {}, options = {}) {
  if (!address) {
    throw new Error("A shipping address is required to contact Printful.");
  }

  const {
    fullName,
    name,
    firstName,
    lastName,
    area,
    address1,
    address2,
    city,
    state,
    state_code,
    stateCode,
    province,
    postalCode,
    zip,
    pincode,
    phoneNumber,
    phone,
    country,
    country_code,
    countryCode,
  } = address;

  const fallbackCountry = options.fallbackCountry || PRINTFUL_DEFAULT_COUNTRY;

  const recipient = {
    name:
      fullName ||
      name ||
      [firstName, lastName].filter(Boolean).join(" ") ||
      "PosterGenius Customer",
    address1: address1 || area || address?.line1 || "",
    address2: address2 || address?.line2 || "",
    city: city || address?.city || "",
    state_code:
      (state_code || stateCode || state || province || "").toString().trim() ||
      undefined,
    zip: (zip || postalCode || pincode || "").toString().trim() || undefined,
    country_code:
      (country_code || countryCode || country || fallbackCountry || "US")
        .toString()
        .trim()
        .toUpperCase(),
    phone: (phone || phoneNumber || "").toString().trim() || undefined,
  };

  if (!recipient.address1 || !recipient.city || !recipient.zip) {
    throw new Error(
      "Incomplete shipping address. Printful requires address line, city, and postal code."
    );
  }

  return recipient;
}

export async function calculateShippingRates({ recipient, items }) {
  if (!recipient) {
    throw new Error("recipient is required when fetching Printful shipping rates");
  }
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("At least one physical item is required to request shipping rates");
  }

  return printfulRequest("/shipping/rates", {
    method: "POST",
    body: { recipient, items },
  });
}

export function pickCheapestRate(rates = []) {
  if (!Array.isArray(rates) || rates.length === 0) return null;
  return [...rates].sort((a, b) => Number(a.rate) - Number(b.rate))[0];
}

export async function createPrintfulOrder(
  orderPayload,
  { confirm = true } = {}
) {
  if (!orderPayload) {
    throw new Error("Order payload is required when creating a Printful order.");
  }

  const body = { ...orderPayload, confirm };
  return printfulRequest("/orders", { method: "POST", body });
}

export async function cancelPrintfulOrder(printfulOrderId) {
  if (!printfulOrderId) {
    throw new Error("A Printful order ID is required to cancel an order.");
  }

  return printfulRequest(`/orders/${printfulOrderId}/cancel`, { method: "POST" });
}

export function verifyWebhookSignature(rawBody, signature) {
  if (!PRINTFUL_WEBHOOK_SECRET) {
    throw new Error("Missing PRINTFUL_WEBHOOK_SECRET environment variable. Configure it to verify Printful webhooks.");
  }

  if (!signature) {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", PRINTFUL_WEBHOOK_SECRET)
    .update(rawBody, "utf8")
    .digest("base64");

  const provided = Buffer.from(signature);
  const comparison = Buffer.from(expected);

  if (provided.length !== comparison.length) {
    return false;
  }

  return crypto.timingSafeEqual(provided, comparison);
}

export function parseWebhook(rawBody) {
  if (!rawBody) {
    throw new Error("Cannot parse empty Printful webhook body.");
  }

  return JSON.parse(rawBody);
}

export function mapPrintfulStatus(status) {
  if (!status) return "Order Placed";
  const normalized = String(status).toLowerCase();
  switch (normalized) {
    case "draft":
    case "pending":
      return "Awaiting Fulfillment";
    case "failed":
    case "order_failed":
      return "Fulfillment Failed";
    case "canceled":
    case "cancelled":
    case "order_canceled":
      return "Canceled";
    case "partial":
    case "inprocess":
      return "In Production";
    case "fulfilled":
    case "shipped":
    case "package_shipped":
      return "Shipped";
    case "delivered":
    case "package_delivered":
      return "Delivered";
    default:
      return status;
  }
}

export function extractTrackingFromPrintful(payload = {}) {
  const shipments =
    payload?.shipments || payload?.result?.shipments || payload?.shipment || [];

  const flattened = Array.isArray(shipments)
    ? shipments
    : shipments
    ? [shipments]
    : [];

  for (const shipment of flattened) {
    const trackingUrl = shipment?.tracking_url || shipment?.tracking_url_provider;
    const trackingNumber = shipment?.tracking_number;
    if (trackingUrl || trackingNumber) {
      return {
        trackingUrl: trackingUrl || null,
        trackingNumber: trackingNumber || null,
        carrier: shipment?.carrier || shipment?.service || null,
      };
    }
  }

  return { trackingUrl: null, trackingNumber: null, carrier: null };
}

export { PRINTFUL_VARIANT_MAP };
