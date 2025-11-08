import { render, screen } from "@testing-library/react";
import OrderSummary from "@/components/OrderSummary";
import { useAppContext } from "@/context/AppContext";

jest.mock("@/context/AppContext", () => ({
  useAppContext: jest.fn(),
}));

jest.mock("@stripe/stripe-js", () => ({
  loadStripe: jest.fn(() => Promise.resolve({})),
}));

jest.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children }) => <div>{children}</div>,
  useStripe: () => ({ redirectToCheckout: jest.fn() }),
}));

jest.mock("@clerk/nextjs", () => ({
  useClerk: () => ({ openSignIn: jest.fn() }),
}));

jest.mock("axios", () => ({
  get: jest.fn(() => Promise.resolve({ data: { success: true, addresses: [] } })),
  post: jest.fn(() => Promise.resolve({ data: { success: true, rates: [] } })),
}));

jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

const buildContext = () => ({
  currency: "$",
  router: { push: jest.fn() },
  getCartCount: jest.fn(() => 2),
  getCartAmount: jest.fn(() => 40),
  getToken: jest.fn(() => Promise.resolve("token")),
  user: null,
  cartItems: {
    "product-1": { productId: "product-1", quantity: 2, price: 20 },
  },
  shippingQuote: { amount: 0, currency: "usd" },
  updateShippingQuote: jest.fn(),
  resetShippingQuote: jest.fn(),
});

describe("OrderSummary shipping display", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders Free when shipping amount is zero", async () => {
    useAppContext.mockReturnValue(buildContext());

    render(<OrderSummary shippingQuote={{ amount: 0, currency: "usd" }} />);

    expect(await screen.findByText("Free")).toBeInTheDocument();
  });

  it("renders a formatted currency amount when shipping is charged", async () => {
    useAppContext.mockReturnValue(buildContext());

    render(<OrderSummary shippingQuote={{ amount: 7.5, currency: "usd" }} />);

    expect(await screen.findByText("$7.50")).toBeInTheDocument();
  });
});

