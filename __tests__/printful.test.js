/** @jest-environment node */

process.env.PRINTFUL_API_KEY = "printful_test_key";
process.env.PRINTFUL_DEFAULT_COUNTRY = "CA";

const fetchMock = jest.fn();
global.fetch = fetchMock;

const {
  calculateShippingRates,
  createPrintfulOrder,
  formatRecipientFromAddress,
  assertVariantIdForProduct,
  mapPrintfulStatus,
  extractTrackingFromPrintful,
  pickCheapestRate,
} = require("@/lib/printful");

describe("printful helpers", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  test("normalizes recipient data for Printful", () => {
    expect(
      formatRecipientFromAddress({
        fullName: "Poster Buyer",
        area: "123 King St W",
        city: "Toronto",
        province: "ON",
        postalCode: "M5H 1J9",
        phone: "555-1111",
        country: "CAD",
      })
    ).toEqual({
      name: "Poster Buyer",
      address1: "123 King St W",
      address2: "",
      city: "Toronto",
      state_code: "ON",
      zip: "M5H1J9",
      country_code: "CA",
      phone: "555-1111",
    });
  });

  test("resolves configured product variant IDs by size", () => {
    const product = {
      name: "Toronto Skyline",
      isPrintfulEnabled: true,
      printfulVariantIds: {
        medium_18x24: 987654,
      },
    };

    expect(assertVariantIdForProduct(product, "18 x 24")).toBe(987654);
  });

  test("selects the cheapest shipping rate", () => {
    expect(
      pickCheapestRate([
        { id: "express", rate: "14.50" },
        { id: "standard", rate: "7.50" },
        { id: "economy", rate: "9.25" },
      ])
    ).toEqual({ id: "standard", rate: "7.50" });
  });

  test("maps Printful statuses to storefront labels", () => {
    expect(mapPrintfulStatus("pending")).toBe("Awaiting Fulfillment");
    expect(mapPrintfulStatus("inprocess")).toBe("In Production");
    expect(mapPrintfulStatus("package_shipped")).toBe("Shipped");
    expect(mapPrintfulStatus("package_delivered")).toBe("Delivered");
    expect(mapPrintfulStatus("custom-status")).toBe("custom-status");
  });

  test("extracts tracking details from shipment payloads", () => {
    expect(
      extractTrackingFromPrintful({
        shipments: [
          {
            tracking_url: "https://carrier.example/track/123",
            tracking_number: "TRACK123",
            carrier: "UPS",
          },
        ],
      })
    ).toEqual({
      trackingUrl: "https://carrier.example/track/123",
      trackingNumber: "TRACK123",
      carrier: "UPS",
    });
  });

  test("requests shipping rates from Printful with the expected payload", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      text: jest
        .fn()
        .mockResolvedValue(JSON.stringify({ result: [{ id: "standard", rate: "7.50" }] })),
    });

    const recipient = {
      name: "Poster Buyer",
      address1: "123 King St W",
      city: "Toronto",
      zip: "M5H1J9",
      country_code: "CA",
    };
    const items = [{ variant_id: 987654, quantity: 1 }];

    const result = await calculateShippingRates({ recipient, items });

    expect(result).toEqual([{ id: "standard", rate: "7.50" }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.printful.com/shipping/rates");
    expect(options.method).toBe("POST");
    expect(options.cache).toBe("no-store");
    expect(options.headers).toMatchObject({
      Authorization: "Bearer printful_test_key",
      "Content-Type": "application/json",
      "X-PF-Store-Id": "16958262",
    });
    expect(JSON.parse(options.body)).toEqual({ recipient, items });
  });

  test("creates a Printful order with confirm enabled by default", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      text: jest
        .fn()
        .mockResolvedValue(JSON.stringify({ result: { id: 12345, status: "draft" } })),
    });

    const payload = {
      external_id: "order_123",
      recipient: {
        name: "Poster Buyer",
        address1: "123 King St W",
        city: "Toronto",
        zip: "M5H1J9",
        country_code: "CA",
      },
      items: [{ variant_id: 987654, quantity: 1 }],
    };

    const result = await createPrintfulOrder(payload);

    expect(result).toEqual({ id: 12345, status: "draft" });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.printful.com/orders");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({
      ...payload,
      confirm: true,
    });
  });
});
