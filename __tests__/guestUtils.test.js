import { getOrCreateGuestId, isGuestIdExpired, __internal } from '../lib/guestUtils';

describe('guestUtils', () => {
  const originalCrypto = globalThis.crypto;
  const originalLocalStorage = globalThis.localStorage;
  let randomUUIDMock;

  const setLocalStorageValue = (key, value) => {
    if (!globalThis.localStorage) {
      throw new Error('localStorage is not defined in the test environment');
    }
    globalThis.localStorage.setItem(key, value);
  };

  beforeEach(() => {
    // Ensure a clean slate for each test run.
    if (!globalThis.localStorage) {
      globalThis.localStorage = window.localStorage;
    }
    globalThis.localStorage.clear();

    randomUUIDMock = jest.fn(() => `mock-uuid-${Math.random().toString(16).slice(2)}`);

    if (!globalThis.crypto) {
      globalThis.crypto = {};
    }
    globalThis.crypto.randomUUID = randomUUIDMock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    globalThis.localStorage?.clear();

    if (originalCrypto?.randomUUID) {
      globalThis.crypto = originalCrypto;
    } else {
      delete globalThis.crypto;
    }

    if (originalLocalStorage) {
      globalThis.localStorage = originalLocalStorage;
    }
  });

  test('isGuestIdExpired returns true for timestamps older than 30 days', () => {
    const now = 1_700_000_000_000;
    jest.spyOn(Date, 'now').mockReturnValue(now);
    const oldTimestamp = new Date(now - __internal.GUEST_ID_RETENTION_MS - 1).toISOString();

    expect(isGuestIdExpired(oldTimestamp)).toBe(true);
  });

  test('generates a new guest ID when none exists', () => {
    randomUUIDMock.mockReturnValueOnce('mock-uuid-new');

    const id = getOrCreateGuestId();
    expect(id).toBe('mock-uuid-new');

    const stored = globalThis.localStorage.getItem(__internal.GUEST_ID_STORAGE_KEY);
    const parsed = JSON.parse(stored);
    expect(parsed).toMatchObject({ id: 'mock-uuid-new' });
    expect(randomUUIDMock).toHaveBeenCalledTimes(1);
  });

  test('reuses an existing guest ID when it is still valid', () => {
    const now = 1_700_000_000_000;
    jest.spyOn(Date, 'now').mockReturnValue(now);
    const freshTimestamp = new Date(now - __internal.GUEST_ID_RETENTION_MS / 2).toISOString();
    const storedPayload = JSON.stringify({ id: 'existing-uuid', createdAt: freshTimestamp });
    setLocalStorageValue(__internal.GUEST_ID_STORAGE_KEY, storedPayload);

    const id = getOrCreateGuestId();
    expect(id).toBe('existing-uuid');
    expect(randomUUIDMock).not.toHaveBeenCalled();
  });

  test('regenerates a guest ID when the stored value is expired', () => {
    const now = 1_700_000_000_000;
    jest.spyOn(Date, 'now').mockReturnValue(now);
    const staleTimestamp = new Date(now - __internal.GUEST_ID_RETENTION_MS - 1).toISOString();
    const storedPayload = JSON.stringify({ id: 'stale-uuid', createdAt: staleTimestamp });
    setLocalStorageValue(__internal.GUEST_ID_STORAGE_KEY, storedPayload);
    randomUUIDMock.mockReturnValueOnce('fresh-uuid');

    const id = getOrCreateGuestId();
    expect(id).toBe('fresh-uuid');
    expect(randomUUIDMock).toHaveBeenCalledTimes(1);
    const stored = globalThis.localStorage.getItem(__internal.GUEST_ID_STORAGE_KEY);
    expect(stored).toEqual(expect.stringContaining('fresh-uuid'));
  });
});
