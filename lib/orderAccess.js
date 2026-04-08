export const GUEST_ORDER_ACCESS_STORAGE_KEY = "posterGenius.orderAccessTokens";

export function createGuestAccessToken() {
  return crypto.randomUUID();
}
