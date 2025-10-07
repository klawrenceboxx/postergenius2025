const GUEST_ID_STORAGE_KEY = 'posterGenius.guest';
const GUEST_ID_RETENTION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Determines whether the provided guest ID creation timestamp is older than the
 * retention window.
 *
 * @param {string | number | Date | undefined | null} createdAt - The timestamp representing when the guest ID was created.
 * @returns {boolean} True when the timestamp is older than 30 days, false otherwise.
 */
export function isGuestIdExpired(createdAt) {
  if (!createdAt) {
    return true;
  }

  const createdTime = new Date(createdAt).getTime();
  if (Number.isNaN(createdTime)) {
    return true;
  }

  return Date.now() - createdTime > GUEST_ID_RETENTION_MS;
}

/**
 * Retrieves a guest ID from localStorage or creates one if missing/expired.
 *
 * @returns {string | null} The guest ID if available on the client, otherwise null.
 */
export function getOrCreateGuestId() {
  if (typeof window === 'undefined') {
    return null;
  }

  const storage = window.localStorage;
  if (!storage) {
    return null;
  }

  try {
    const existingValue = storage.getItem(GUEST_ID_STORAGE_KEY);
    if (existingValue) {
      const parsed = JSON.parse(existingValue);
      if (parsed?.id && !isGuestIdExpired(parsed.createdAt)) {
        console.log('[guestUtils] Reusing existing guestId:', parsed.id);
        return parsed.id;
      }
    }
  } catch (error) {
    console.warn('[guestUtils] Failed to parse stored guestId. Creating a new one.', error);
  }

  const newId = window.crypto?.randomUUID?.();
  if (!newId) {
    console.error('[guestUtils] Unable to generate guestId: window.crypto.randomUUID is unavailable.');
    return null;
  }

  const createdAt = new Date().toISOString();
  const payload = JSON.stringify({ id: newId, createdAt });
  storage.setItem(GUEST_ID_STORAGE_KEY, payload);
  console.log('[guestUtils] Created new guestId:', newId, 'at', createdAt);

  return newId;
}

export const __internal = {
  GUEST_ID_STORAGE_KEY,
  GUEST_ID_RETENTION_MS,
};

/**
 * Manual verification:
 * 1. Trigger getOrCreateGuestId() inside any client component or in DevTools (window.getOrCreateGuestId?).
 * 2. Inspect localStorage for the `posterGenius.guest` entry and confirm it contains `{ id, createdAt }`.
 * 3. Reload within 30 days to observe reuse logs in the console.
 *
 * Automated verification with Jest:
 * 1. Ensure dev dependencies exist by running:
 *    `npm install --save-dev jest @testing-library/react @testing-library/jest-dom jest-environment-jsdom`.
 * 2. Run tests with `npx jest` to execute coverage in `__tests__/guestUtils.test.js`.
 */
