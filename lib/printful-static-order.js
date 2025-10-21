export const STATIC_PRINTFUL_ORDER_PAYLOAD = {
  external_id: "static-test-003",
  shipping: "STANDARD",
  recipient: {
    name: "Test User",
    address1: "123 Example Street",
    city: "Toronto",
    state_code: "ON",
    country_code: "CA",
    zip: "M5V1E3",
    email: "test@example.com",
  },
  items: [
    {
      variant_id: 3876,
      quantity: 1,
      name: "Cool Lionee Poster (12×18)",
      files: [
        {
          type: "default",
          url: "https://d1mhf9senw3mzj.cloudfront.net/products/user_3340Zm2wcQlksBOgDX3hMuoI1y6/1758806593225-13dd171d-6e35-4bf2-9da9-f2eb051ad352.jpg",
        },
      ],
    },
  ],
};

function clonePayload(payload) {
  return JSON.parse(JSON.stringify(payload));
}

export function buildStaticPrintfulOrderPayload() {
  return clonePayload(STATIC_PRINTFUL_ORDER_PAYLOAD);
}

export async function submitStaticPrintfulOrder() {
  if (!process.env.PRINTFUL_API_KEY) {
    const error = new Error("PRINTFUL_API_KEY is not configured.");
    error.status = 500;
    throw error;
  }

  const payload = buildStaticPrintfulOrderPayload();

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
  };

  const storeId = process.env.PRINTFUL_STORE_ID || "16958262";
  if (storeId) {
    headers["X-PF-Store-Id"] = storeId;
  }

  const response = await fetch("https://api.printful.com/orders", {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      data?.error?.message ||
      data?.error ||
      data?.message ||
      "Failed to create Printful order";
    const error = new Error(message);
    error.status = response.status || 500;
    error.details = data;
    throw error;
  }

  return data;
}
