/** @jest-environment node */

process.env.STRIPE_SECRET_KEY = "sk_test_purchase_flows";
process.env.STRIPE_SUCCESS_URL = "https://example.com/order-placed";
process.env.STRIPE_CANCEL_URL = "https://example.com/cart";
process.env.STRIPE_CURRENCY = "cad";

const mockCheckoutSessionCreate = jest.fn();
const mockPaymentIntentCreate = jest.fn();
const mockCouponCreate = jest.fn();

const mockGetAuth = jest.fn();
const mockConnectDB = jest.fn();
const mockProductFindById = jest.fn();
const mockAddressFindById = jest.fn();
const mockGuestAddressFindOne = jest.fn();
const mockPromoFindOne = jest.fn();
const mockComputePricing = jest.fn();
const mockEnsureProductCdnUrl = jest.fn();
const mockCalculateShippingRates = jest.fn();
const mockFormatRecipientFromAddress = jest.fn();
const mockNormalizeDimensions = jest.fn();
const mockAssertVariantIdForProduct = jest.fn();
const mockPickCheapestRate = jest.fn();
const mockApplyPromo = jest.fn();
const mockRecordStoreEvents = jest.fn();

jest.mock("stripe", () =>
  jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: mockCheckoutSessionCreate,
      },
    },
    paymentIntents: {
      create: mockPaymentIntentCreate,
    },
    coupons: {
      create: mockCouponCreate,
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

jest.mock("@/models/Product", () => ({
  __esModule: true,
  default: {
    findById: (...args) => mockProductFindById(...args),
  },
}));

jest.mock("@/models/Address", () => ({
  __esModule: true,
  default: {
    findById: (...args) => mockAddressFindById(...args),
  },
}));

jest.mock("@/models/GuestAddress", () => ({
  __esModule: true,
  default: {
    findOne: (...args) => mockGuestAddressFindOne(...args),
  },
}));

jest.mock("@/models/PromoModel", () => ({
  __esModule: true,
  default: {
    findOne: (...args) => mockPromoFindOne(...args),
  },
}));

jest.mock("@/lib/pricing", () => ({
  computePricing: (...args) => mockComputePricing(...args),
}));

jest.mock("@/lib/cdn", () => ({
  ensureProductCdnUrl: (...args) => mockEnsureProductCdnUrl(...args),
}));

jest.mock("@/lib/printful", () => ({
  calculateShippingRates: (...args) => mockCalculateShippingRates(...args),
  formatRecipientFromAddress: (...args) => mockFormatRecipientFromAddress(...args),
  normalizeDimensions: (...args) => mockNormalizeDimensions(...args),
  assertVariantIdForProduct: (...args) => mockAssertVariantIdForProduct(...args),
  pickCheapestRate: (...args) => mockPickCheapestRate(...args),
}));

jest.mock("@/lib/promoCode", () => ({
  applyPromo: (...args) => mockApplyPromo(...args),
}));

jest.mock("@/lib/storeEvents", () => ({
  STORE_EVENT_TYPES: {
    CHECKOUT_STARTED: "checkout_started",
  },
  recordStoreEvents: (...args) => mockRecordStoreEvents(...args),
}));

const { POST } = require("@/app/api/stripe/create-session/route");

function makeLeanResult(value) {
  return {
    lean: jest.fn().mockResolvedValue(value),
  };
}

function makeRequest(body, headers = {}) {
  const normalizedHeaders = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value])
  );

  return {
    headers: {
      get: (key) => normalizedHeaders[String(key).toLowerCase()] ?? null,
    },
    json: jest.fn().mockResolvedValue(body),
  };
}

async function readJson(response) {
  return response.json();
}

describe("stripe create-session purchase flows", () => {
  const productDoc = {
    _id: "prod_1",
    name: "Toronto Skyline",
  };

  const signedInAddressDoc = {
    fullName: "Signed In Buyer",
    phoneNumber: "555-1000",
    area: "123 King St W",
    city: "Toronto",
    pincode: "M5H 1J9",
    country: "CA",
    state: "ON",
  };

  const guestAddressDoc = {
    guestId: "guest_123",
    fullName: "Guest Buyer",
    email: "guest@example.com",
    phone: "555-2000",
    street: "456 Queen St E",
    city: "Toronto",
    postalCode: "M4M 1G9",
    country: "CA",
    province: "ON",
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockGetAuth.mockReturnValue({ userId: "user_123" });
    mockConnectDB.mockResolvedValue(undefined);

    mockProductFindById.mockImplementation(() => makeLeanResult(productDoc));
    mockAddressFindById.mockImplementation(() => makeLeanResult(signedInAddressDoc));
    mockGuestAddressFindOne.mockImplementation(() => makeLeanResult(guestAddressDoc));
    mockPromoFindOne.mockImplementation(() => makeLeanResult(null));

    mockComputePricing.mockReturnValue({
      defaultPhysicalFinalPrice: 20,
      digitalFinalPrice: 10,
      defaultPhysicalDimensions: "18x24",
      physicalPricing: {
        "18x24": { finalPrice: 20 },
      },
    });

    mockEnsureProductCdnUrl.mockReturnValue("https://cdn.example.com/poster.jpg");
    mockCalculateShippingRates.mockResolvedValue([
      {
        id: "rate_standard",
        name: "Standard",
        rate: "7.50",
        currency: "CAD",
      },
    ]);
    mockPickCheapestRate.mockImplementation((rates) => rates[0]);
    mockFormatRecipientFromAddress.mockReturnValue({
      name: "Recipient Name",
      address1: "123 Main St",
      address2: "",
      city: "Toronto",
      state_code: "ON",
      zip: "M5H 1J9",
      country_code: "CA",
      phone: "555-3000",
    });
    mockNormalizeDimensions.mockImplementation((value) => value);
    mockAssertVariantIdForProduct.mockReturnValue(987654);
    mockApplyPromo.mockImplementation(({ totalPrice, shippingCost }) => ({
      valid: false,
      discount: 0,
      newTotal: totalPrice + shippingCost,
      originalTotal: totalPrice + shippingCost,
      promoType: null,
      promoValue: null,
      promoCode: null,
      message: "",
    }));
    mockRecordStoreEvents.mockResolvedValue(undefined);

    mockCheckoutSessionCreate.mockResolvedValue({
      id: "cs_test_123",
      url: "https://checkout.stripe.com/c/session_123",
    });
    mockPaymentIntentCreate.mockResolvedValue({
      id: "pi_test_123",
      client_secret: "pi_secret_123",
    });
    mockCouponCreate.mockResolvedValue({ id: "coupon_test_123" });
  });

  test("creates a signed-in digital checkout session", async () => {
    const response = await POST(
      makeRequest({
        items: [
          {
            productId: "prod_1",
            quantity: 2,
            format: "digital",
            price: 10,
          },
        ],
        successUrl: "https://example.com/order-placed",
        cancelUrl: "https://example.com/cart",
        customerEmail: "signed@example.com",
      })
    );

    const payload = await readJson(response);
    const sessionArgs = mockCheckoutSessionCreate.mock.calls[0][0];

    expect(payload).toMatchObject({
      success: true,
      type: "checkout_session",
      sessionId: "cs_test_123",
    });
    expect(sessionArgs.customer_email).toBe("signed@example.com");
    expect(sessionArgs.metadata).toMatchObject({
      userId: "user_123",
      orderType: "digital",
      customerEmail: "signed@example.com",
      subtotalAmount: "20.00",
      taxAmount: "2.60",
      totalAmount: "22.60",
      currency: "cad",
    });
    expect(sessionArgs.success_url).toBe(
      "https://example.com/order-placed?session_id={CHECKOUT_SESSION_ID}"
    );
    expect(sessionArgs.cancel_url).toBe("https://example.com/cart");
    expect(sessionArgs.line_items).toHaveLength(2);
    expect(sessionArgs.line_items[0]).toMatchObject({
      quantity: 2,
      price_data: {
        currency: "cad",
        unit_amount: 1000,
      },
    });
  });

  test("creates a signed-in physical checkout session with shipping", async () => {
    const response = await POST(
      makeRequest({
        items: [
          {
            productId: "prod_1",
            quantity: 1,
            format: "physical",
            dimensions: "18x24",
            price: 20,
          },
        ],
        address: "addr_123",
        successUrl: "https://example.com/order-placed",
        cancelUrl: "https://example.com/cart",
        customerEmail: "signed-physical@example.com",
      })
    );

    const payload = await readJson(response);
    const sessionArgs = mockCheckoutSessionCreate.mock.calls[0][0];

    expect(payload).toMatchObject({
      success: true,
      type: "checkout_session",
    });
    expect(mockAddressFindById).toHaveBeenCalledWith("addr_123");
    expect(mockCalculateShippingRates).toHaveBeenCalledTimes(1);
    expect(sessionArgs.customer_email).toBe("signed-physical@example.com");
    expect(sessionArgs.metadata).toMatchObject({
      userId: "user_123",
      address: "addr_123",
      orderType: "physical",
      customerEmail: "signed-physical@example.com",
      subtotalAmount: "20.00",
      taxAmount: "2.60",
      totalAmount: "30.10",
      currency: "cad",
    });
    expect(sessionArgs.metadata.shipping).toContain("\"id\":\"rate_standard\"");
    expect(sessionArgs.metadata.recipient).toContain("\"country_code\":\"CA\"");
    expect(sessionArgs.metadata.shippingAddressSnapshot).toContain(
      "\"street\":\"123 King St W\""
    );
    expect(sessionArgs.line_items).toHaveLength(3);
    expect(sessionArgs.line_items[2]).toMatchObject({
      quantity: 1,
      price_data: {
        currency: "cad",
        unit_amount: 750,
      },
    });
  });

  test("creates a guest digital checkout session using stored guest details", async () => {
    mockGetAuth.mockReturnValue({ userId: null });

    const response = await POST(
      makeRequest({
        guestId: "guest_123",
        items: [
          {
            productId: "prod_1",
            quantity: 1,
            format: "digital",
            price: 10,
          },
        ],
      })
    );

    const payload = await readJson(response);
    const sessionArgs = mockCheckoutSessionCreate.mock.calls[0][0];

    expect(payload).toMatchObject({
      success: true,
      type: "checkout_session",
    });
    expect(mockGuestAddressFindOne).toHaveBeenCalledWith({ guestId: "guest_123" });
    expect(sessionArgs.customer_email).toBe("guest@example.com");
    expect(sessionArgs.metadata).toMatchObject({
      guestId: "guest_123",
      orderType: "digital",
      customerEmail: "guest@example.com",
      subtotalAmount: "10.00",
      taxAmount: "1.30",
      totalAmount: "11.30",
      currency: "cad",
    });
    expect(sessionArgs.metadata.shippingAddressSnapshot).toContain(
      "\"email\":\"guest@example.com\""
    );
    expect(sessionArgs.line_items).toHaveLength(2);
    expect(mockCalculateShippingRates).not.toHaveBeenCalled();
  });

  test("creates a guest physical checkout session with shipping from guest address", async () => {
    mockGetAuth.mockReturnValue({ userId: null });

    const response = await POST(
      makeRequest({
        guestId: "guest_123",
        items: [
          {
            productId: "prod_1",
            quantity: 1,
            format: "physical",
            dimensions: "18x24",
            price: 20,
          },
        ],
      })
    );

    const payload = await readJson(response);
    const sessionArgs = mockCheckoutSessionCreate.mock.calls[0][0];

    expect(payload).toMatchObject({
      success: true,
      type: "checkout_session",
    });
    expect(mockGuestAddressFindOne).toHaveBeenCalledWith({ guestId: "guest_123" });
    expect(mockCalculateShippingRates).toHaveBeenCalledTimes(1);
    expect(sessionArgs.customer_email).toBe("guest@example.com");
    expect(sessionArgs.metadata).toMatchObject({
      guestId: "guest_123",
      orderType: "physical",
      customerEmail: "guest@example.com",
      subtotalAmount: "20.00",
      taxAmount: "2.60",
      totalAmount: "30.10",
      currency: "cad",
    });
    expect(sessionArgs.metadata.shipping).toContain("\"name\":\"Standard\"");
    expect(sessionArgs.metadata.shippingAddressSnapshot).toContain(
      "\"street\":\"456 Queen St E\""
    );
    expect(sessionArgs.line_items).toHaveLength(3);
    expect(sessionArgs.line_items[2]).toMatchObject({
      quantity: 1,
      price_data: {
        currency: "cad",
        unit_amount: 750,
      },
    });
  });
});
