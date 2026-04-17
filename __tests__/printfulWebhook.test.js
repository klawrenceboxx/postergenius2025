/** @jest-environment node */

const mockConnectDB = jest.fn();
const mockWebhookFailureCreate = jest.fn();
const mockProcessPrintfulWebhook = jest.fn();

jest.mock("@/config/db", () => ({
  __esModule: true,
  default: (...args) => mockConnectDB(...args),
}));

jest.mock("@/models/WebhookFailure", () => ({
  __esModule: true,
  default: {
    create: (...args) => mockWebhookFailureCreate(...args),
  },
}));

jest.mock("@/lib/printful-webhook-processor", () => ({
  processPrintfulWebhook: (...args) => mockProcessPrintfulWebhook(...args),
}));

const { POST } = require("@/app/api/printful/webhook/route");

function makeRequest(rawBody) {
  return {
    text: jest.fn().mockResolvedValue(rawBody),
  };
}

async function readJson(response) {
  return response.json();
}

describe("printful webhook route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConnectDB.mockResolvedValue(undefined);
    mockWebhookFailureCreate.mockResolvedValue(undefined);
    mockProcessPrintfulWebhook.mockResolvedValue(undefined);
  });

  test("rejects invalid JSON and records a webhook failure", async () => {
    const response = await POST(makeRequest("{invalid-json"));
    const payload = await readJson(response);

    expect(response.status).toBe(400);
    expect(payload).toEqual({ error: "Webhook error" });
    expect(mockWebhookFailureCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "invalid_payload",
        rawBody: "{invalid-json",
      })
    );
    expect(mockProcessPrintfulWebhook).not.toHaveBeenCalled();
  });

  test("rejects webhook payloads from an unrecognized store", async () => {
    const rawBody = JSON.stringify({
      store: 12345,
      type: "package_shipped",
    });

    const response = await POST(makeRequest(rawBody));
    const payload = await readJson(response);

    expect(response.status).toBe(400);
    expect(payload).toEqual({ error: "Webhook error" });
    expect(mockWebhookFailureCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "package_shipped",
        rawBody,
      })
    );
    expect(mockProcessPrintfulWebhook).not.toHaveBeenCalled();
  });

  test("processes a valid Printful webhook", async () => {
    const rawBody = JSON.stringify({
      store: 16958262,
      type: "package_shipped",
      data: {
        order: {
          id: 555,
          external_id: "507f1f77bcf86cd799439011",
          status: "shipped",
        },
      },
    });

    const response = await POST(makeRequest(rawBody));
    const payload = await readJson(response);

    expect(response.status).toBe(200);
    expect(payload).toEqual({ ok: true });
    expect(mockProcessPrintfulWebhook).toHaveBeenCalledWith(JSON.parse(rawBody));
    expect(mockWebhookFailureCreate).not.toHaveBeenCalled();
  });
});
