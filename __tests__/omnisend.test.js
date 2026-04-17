/** @jest-environment node */

const originalOmnisendApiKey = process.env.OMNISEND_API_KEY;
const fetchMock = jest.fn();

global.fetch = fetchMock;

const { POST } = require("@/app/api/omnisend/subscribe/route");

function makeRequest(body) {
  return {
    json: jest.fn().mockResolvedValue(body),
  };
}

async function readJson(response) {
  return response.json();
}

describe("omnisend subscribe route", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  afterEach(() => {
    if (originalOmnisendApiKey === undefined) {
      delete process.env.OMNISEND_API_KEY;
    } else {
      process.env.OMNISEND_API_KEY = originalOmnisendApiKey;
    }
  });

  test("rejects an invalid email address", async () => {
    process.env.OMNISEND_API_KEY = "omnisend_test_key";

    const response = await POST(makeRequest({ email: "not-an-email" }));
    const payload = await readJson(response);

    expect(response.status).toBe(400);
    expect(payload).toEqual({
      success: false,
      message: "A valid email address is required.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("returns a server error when the API key is missing", async () => {
    delete process.env.OMNISEND_API_KEY;

    const response = await POST(makeRequest({ email: "buyer@example.com" }));
    const payload = await readJson(response);

    expect(response.status).toBe(500);
    expect(payload).toEqual({
      success: false,
      message: "Email service is not configured.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("subscribes successfully and sends the sanitized payload", async () => {
    process.env.OMNISEND_API_KEY = "omnisend_test_key";
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue(""),
    });

    const response = await POST(
      makeRequest({
        email: "Buyer@Example.com ",
        source: "spring-popup",
      })
    );
    const payload = await readJson(response);

    expect(response.status).toBe(200);
    expect(payload).toEqual({ success: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.omnisend.com/v5/contacts");
    expect(options.method).toBe("POST");
    expect(options.headers).toEqual({
      "Content-Type": "application/json",
      "X-API-KEY": "omnisend_test_key",
    });

    const body = JSON.parse(options.body);
    expect(body).toMatchObject({
      email: "buyer@example.com",
      status: "subscribed",
      tags: ["spring-popup"],
      sendWelcomeEmail: true,
    });
    expect(body.statusDate).toEqual(expect.any(String));
  });

  test("treats already-subscribed conflicts as success", async () => {
    process.env.OMNISEND_API_KEY = "omnisend_test_key";
    fetchMock.mockResolvedValue({
      ok: false,
      status: 409,
      text: jest.fn().mockResolvedValue("already subscribed"),
    });

    const response = await POST(makeRequest({ email: "buyer@example.com" }));
    const payload = await readJson(response);

    expect(response.status).toBe(200);
    expect(payload).toEqual({ success: true });
  });
});
