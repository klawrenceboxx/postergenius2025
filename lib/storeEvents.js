import connectDB from "@/config/db";
import StoreEvent from "@/models/StoreEvent";

export const STORE_EVENT_TYPES = {
  PRODUCT_VIEW: "product_view",
  WISHLIST_ADDED: "wishlist_added",
  WISHLIST_REMOVED: "wishlist_removed",
  CART_ADDED: "cart_added",
  CART_QUANTITY_UPDATED: "cart_quantity_updated",
  CART_REMOVED: "cart_removed",
  CHECKOUT_STARTED: "checkout_started",
  PURCHASE_COMPLETED: "purchase_completed",
};

const RANGE_TO_DAYS = {
  "24h": 1,
  "7d": 7,
  "30d": 30,
  all: null,
};

function asString(value) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  return String(value);
}

function asNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function buildSessionKey({ userId, guestId }) {
  if (userId) return `user:${userId}`;
  if (guestId) return `guest:${guestId}`;
  return undefined;
}

function normalizeEventPayload(payload = {}) {
  const userId = asString(payload.userId);
  const guestId = asString(payload.guestId);
  const quantity = Math.max(1, asNumber(payload.quantity, 1));
  const unitPrice = Math.max(0, asNumber(payload.unitPrice, 0));
  const lineTotal = Math.max(
    0,
    asNumber(payload.lineTotal, Number((unitPrice * quantity).toFixed(2)))
  );

  return {
    eventType: payload.eventType,
    productId: asString(payload.productId),
    userId,
    guestId,
    sessionKey: buildSessionKey({ userId, guestId }),
    orderId: asString(payload.orderId),
    stripeSessionId: asString(payload.stripeSessionId),
    format: asString(payload.format),
    dimensions: asString(payload.dimensions),
    quantity,
    unitPrice,
    lineTotal,
    currency: asString(payload.currency) || "cad",
    source: asString(payload.source) || "web",
    metadata:
      payload.metadata && typeof payload.metadata === "object"
        ? payload.metadata
        : {},
  };
}

export async function recordStoreEvent(payload) {
  if (!payload?.eventType) {
    return null;
  }

  await connectDB();
  const normalized = normalizeEventPayload(payload);
  return StoreEvent.create(normalized);
}

export async function recordStoreEvents(events = []) {
  const normalizedEvents = events
    .filter((event) => event?.eventType)
    .map(normalizeEventPayload);

  if (!normalizedEvents.length) {
    return [];
  }

  await connectDB();
  return StoreEvent.insertMany(normalizedEvents, { ordered: false });
}

export async function recordProductViewOnce({
  productId,
  userId,
  guestId,
  source = "web",
  metadata = {},
  dedupeMinutes = 60,
}) {
  const normalizedProductId = asString(productId);
  const sessionKey = buildSessionKey({ userId, guestId });

  if (!normalizedProductId || !sessionKey) {
    return { created: false, reason: "missing_identity" };
  }

  await connectDB();

  const since = new Date(Date.now() - dedupeMinutes * 60 * 1000);
  const existing = await StoreEvent.findOne({
    eventType: STORE_EVENT_TYPES.PRODUCT_VIEW,
    productId: normalizedProductId,
    sessionKey,
    createdAt: { $gte: since },
  }).lean();

  if (existing) {
    return { created: false, reason: "deduped" };
  }

  await StoreEvent.create(
    normalizeEventPayload({
      eventType: STORE_EVENT_TYPES.PRODUCT_VIEW,
      productId: normalizedProductId,
      userId,
      guestId,
      source,
      metadata,
    })
  );

  return { created: true };
}

export function getRangeStart(range = "7d") {
  const normalizedRange = RANGE_TO_DAYS[range] !== undefined ? range : "7d";
  const days = RANGE_TO_DAYS[normalizedRange];
  if (days === null) {
    return null;
  }

  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}
