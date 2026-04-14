import {
  buildStripeCouponPayload,
  buildStripeTaxLineItem,
  getStripeCurrency,
} from "../lib/stripeCheckout";

describe("stripeCheckout helpers", () => {
  const originalStripeCurrency = process.env.STRIPE_CURRENCY;

  afterEach(() => {
    if (originalStripeCurrency === undefined) {
      delete process.env.STRIPE_CURRENCY;
    } else {
      process.env.STRIPE_CURRENCY = originalStripeCurrency;
    }
  });

  test("defaults checkout currency to cad", () => {
    delete process.env.STRIPE_CURRENCY;
    expect(getStripeCurrency()).toBe("cad");
  });

  test("uses configured checkout currency when valid", () => {
    process.env.STRIPE_CURRENCY = "USD";
    expect(getStripeCurrency()).toBe("usd");
  });

  test("builds a flat coupon with the active currency", () => {
    expect(
      buildStripeCouponPayload(
        {
          valid: true,
          discount: 5,
          promoType: "flat",
        },
        "cad"
      )
    ).toEqual({
      amount_off: 500,
      currency: "cad",
      duration: "once",
    });
  });

  test("builds a percent coupon without currency", () => {
    expect(
      buildStripeCouponPayload({
        valid: true,
        discount: 6.5,
        promoType: "percent",
        promoValue: 10,
      })
    ).toEqual({
      percent_off: 10,
      duration: "once",
    });
  });

  test("creates a tax line item when tax is present", () => {
    expect(buildStripeTaxLineItem(1.69, "cad")).toEqual({
      price_data: {
        currency: "cad",
        product_data: {
          name: "Tax (13%)",
        },
        unit_amount: 169,
      },
      quantity: 1,
    });
  });

  test("skips a tax line item when tax is zero", () => {
    expect(buildStripeTaxLineItem(0, "cad")).toBeNull();
  });
});
