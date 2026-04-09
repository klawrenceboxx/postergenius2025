import crypto from "node:crypto";

export const ORDER_LOOKUP_TOKEN_TTL_MS = 1000 * 60 * 30;

export function createOrderLookupToken() {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashOrderLookupToken(token);
  const expiresAt = new Date(Date.now() + ORDER_LOOKUP_TOKEN_TTL_MS);

  return { token, tokenHash, expiresAt };
}

export function hashOrderLookupToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

export function buildOrderLookupNumber(orderId) {
  return String(orderId || "").slice(-8).toUpperCase();
}

export function normalizeOrderLookupNumber(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export function matchesOrderLookupNumber(orderId, lookupNumber) {
  const normalizedInput = normalizeOrderLookupNumber(lookupNumber);
  if (!normalizedInput) {
    return false;
  }

  const normalizedId = normalizeOrderLookupNumber(orderId);
  if (normalizedInput === normalizedId) {
    return true;
  }

  return buildOrderLookupNumber(orderId) === normalizedInput;
}

export function isOrderLookupTokenValid(order, token) {
  if (!order || !token) {
    return false;
  }

  const expiresAt = order.guestLookupTokenExpiresAt
    ? new Date(order.guestLookupTokenExpiresAt)
    : null;

  if (!expiresAt || Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
    return false;
  }

  return order.guestLookupTokenHash === hashOrderLookupToken(token);
}
