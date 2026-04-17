/** @jest-environment node */

process.env.STRIPE_SECRET_KEY = "sk_test_confirm_flows";

const mockRetrieveSession = jest.fn();
const mockGetAuth = jest.fn();
const mockConnectDB = jest.fn();
const mockFindOne = jest.fn();
const mockUpdateOne = jest.fn();
const mockBuildOrderLookupNumber = jest.fn();
const mockCreateOrderLookupToken = jest.fn();

jest.mock("stripe", () =>
  jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        retrieve: mockRetrieveSession,
      },
    },
  }))
);

jest.mock("@clerk/nextjs/server", () => ({
  getAuth: (...args) => mockGetAuth(...args),
}));

jest.mock("@/config/db", () => ({
  __esModule: true,
  default: (...args) => mockConnectDB(...args),
}));

jest.mock("@/models/Order", () => ({
  __esModule: true,
  default: {
    findOne: (...args) => mockFindOne(...args),
    updateOne: (...args) => mockUpdateOne(...args),
  },
}));

jest.mock("@/lib/orderAccess", () => ({
  buildOrderLookupNumber: (...args) => mockBuildOrderLookupNumber(...args),
  createOrderLookupToken: (...args) => mockCreateOrderLookupToken(...args),
}));

const { POST } = require("@/app/api/stripe/confirm/route");

function makeRequest(body) {
  return {
    json: jest.fn().mockResolvedValue(body),
  };
}

function makeOrderQueryResult(order) {
  const chain = {
    populate: jest.fn(() => chain),
    lean: jest.fn().mockResolvedValue(order),
  };
  return chain;
}

async function readJson(response) {
  return response.json();
}

describe("stripe confirm route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuth.mockReturnValue({ userId: "user_123" });
    mockConnectDB.mockResolvedValue(undefined);
    mockBuildOrderLookupNumber.mockReturnValue("PG-ORDER-123");
    mockCreateOrderLookupToken.mockReturnValue({
      token: "guest-access-token",
      tokenHash: "hashed-guest-access-token",
      expiresAt: new Date("2026-04-20T12:00:00.000Z"),
    });
    mockUpdateOne.mockResolvedValue({ acknowledged: true });
  });

  test("confirms a paid signed-in order", async () => {
    mockRetrieveSession.mockResolvedValue({
      payment_status: "paid",
      metadata: { userId: "user_123" },
      customer_details: { email: "buyer@example.com" },
      customer_email: null,
    });
    mockFindOne.mockImplementation(() =>
      makeOrderQueryResult({
        _id: "507f1f77bcf86cd799439011",
        stripeSessionId: "cs_paid_signed_in",
        customerEmail: "buyer@example.com",
        status: "Order Placed",
        guestId: null,
      })
    );

    const response = await POST(makeRequest({ sessionId: "cs_paid_signed_in" }));
    const payload = await readJson(response);

    expect(payload).toMatchObject({
      success: true,
      paid: true,
      orderReady: true,
      orderId: "507f1f77bcf86cd799439011",
      orderNumber: "PG-ORDER-123",
      orderAccessToken: null,
      customerEmail: "buyer@example.com",
      status: "Order Placed",
    });
    expect(mockRetrieveSession).toHaveBeenCalledWith("cs_paid_signed_in");
    expect(mockConnectDB).toHaveBeenCalledTimes(1);
    expect(mockUpdateOne).not.toHaveBeenCalled();
  });

  test("rejects a signed-in user trying to confirm another user's order", async () => {
    mockRetrieveSession.mockResolvedValue({
      payment_status: "paid",
      metadata: { userId: "user_other" },
    });

    const response = await POST(makeRequest({ sessionId: "cs_other_user" }));
    const payload = await readJson(response);

    expect(response.status).toBe(403);
    expect(payload).toEqual({
      success: false,
      message: "This order does not belong to the current signed-in user.",
    });
    expect(mockConnectDB).not.toHaveBeenCalled();
  });

  test("creates guest access details for a paid guest order", async () => {
    mockGetAuth.mockReturnValue({ userId: null });
    mockRetrieveSession.mockResolvedValue({
      payment_status: "paid",
      metadata: { guestId: "guest_123" },
      customer_details: { email: "guest@example.com" },
      customer_email: "guest@example.com",
    });
    mockFindOne.mockImplementation(() =>
      makeOrderQueryResult({
        _id: {
          toString: () => "507f1f77bcf86cd799439099",
        },
        stripeSessionId: "cs_paid_guest",
        customerEmail: "guest@example.com",
        status: "Order Placed",
        guestId: "guest_123",
      })
    );

    const response = await POST(makeRequest({ sessionId: "cs_paid_guest" }));
    const payload = await readJson(response);

    expect(payload).toMatchObject({
      success: true,
      paid: true,
      orderReady: true,
      orderId: "507f1f77bcf86cd799439099",
      orderNumber: "PG-ORDER-123",
      orderAccessToken: "guest-access-token",
      orderAccessExpiresAt: "2026-04-20T12:00:00.000Z",
      orderAccessUrl:
        "/orders/507f1f77bcf86cd799439099?token=guest-access-token",
      customerEmail: "guest@example.com",
    });
    expect(mockUpdateOne).toHaveBeenCalledWith(
      { _id: { toString: expect.any(Function) } },
      {
        $set: {
          guestLookupTokenHash: "hashed-guest-access-token",
          guestLookupTokenExpiresAt: new Date("2026-04-20T12:00:00.000Z"),
        },
      }
    );
  });
});
