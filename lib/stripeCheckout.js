const DEFAULT_STRIPE_CURRENCY = "cad";

export function getStripeCurrency() {
  const configuredCurrency = String(process.env.STRIPE_CURRENCY || "")
    .trim()
    .toLowerCase();

  return /^[a-z]{3}$/.test(configuredCurrency)
    ? configuredCurrency
    : DEFAULT_STRIPE_CURRENCY;
}

export function buildStripeTaxLineItem(
  taxAmount,
  currency = DEFAULT_STRIPE_CURRENCY
) {
  const normalizedTaxAmount = Number(taxAmount);
  if (!Number.isFinite(normalizedTaxAmount) || normalizedTaxAmount <= 0) {
    return null;
  }

  return {
    price_data: {
      currency,
      product_data: {
        name: "Tax (13%)",
      },
      unit_amount: Math.round(normalizedTaxAmount * 100),
    },
    quantity: 1,
  };
}

export function buildStripeCouponPayload(
  promoResult,
  currency = DEFAULT_STRIPE_CURRENCY
) {
  if (
    !promoResult?.valid ||
    Number(promoResult?.discount ?? 0) <= 0 ||
    promoResult?.promoType === "shipping"
  ) {
    return null;
  }

  if (promoResult.promoType === "percent") {
    const percentOff = Math.min(
      Math.max(Number(promoResult.promoValue ?? 0), 0),
      100
    );

    if (percentOff <= 0) {
      return null;
    }

    return {
      percent_off: percentOff,
      duration: "once",
    };
  }

  const amountOffCents = Math.round(
    Math.max(Number(promoResult.discount ?? 0), 0) * 100
  );

  if (amountOffCents <= 0) {
    return null;
  }

  return {
    amount_off: amountOffCents,
    currency,
    duration: "once",
  };
}
