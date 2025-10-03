export const SIZE_KEYS = ["M", "L", "XL"];

export const DEFAULT_PHYSICAL_PRICES = {
  M: 30,
  L: 40,
  XL: 50,
};

export const DEFAULT_DIGITAL_PRICE = 6.5;

export const ORIENTATION_DIMENSIONS = {
  portrait: {
    M: "12x18",
    L: "18x24",
    XL: "24x36",
  },
  landscape: {
    M: "18x12",
    L: "24x18",
    XL: "36x24",
  },
};

const FALLBACK_MULTIPLIERS = {
  M: 1,
  L: 4 / 3,
  XL: 5 / 3,
};

export function clampPercentage(value, fallback = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(100, Math.max(0, Math.round(numeric)));
}

export function toPrice(value, fallback, options = {}) {
  const { allowZero = false } = options;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  if (numeric < 0) return fallback;
  if (numeric === 0 && !allowZero) return fallback;
  return Math.round(numeric * 100) / 100;
}

export function applyDiscount(basePrice, discountPct) {
  const base = Number(basePrice) || 0;
  const pct = clampPercentage(discountPct, 0);
  if (base <= 0 || pct <= 0) return Math.round(base * 100) / 100;
  const discounted = base * (1 - pct / 100);
  return Math.round(discounted * 100) / 100;
}

export function computePhysicalBasePrices(product = {}) {
  const basePrice = toPrice(product?.physicalPrices?.M, null);
  const fallbackBase =
    basePrice ?? toPrice(product?.price, null) ?? DEFAULT_PHYSICAL_PRICES.M;

  return SIZE_KEYS.reduce((acc, key) => {
    const explicit = toPrice(product?.physicalPrices?.[key], null);
    if (explicit != null) {
      acc[key] = explicit;
      return acc;
    }

    if (key === "M") {
      acc[key] = fallbackBase;
      return acc;
    }

    const derived = fallbackBase * (FALLBACK_MULTIPLIERS[key] || 1);
    acc[key] = Math.round(derived * 100) / 100;
    return acc;
  }, {});
}

export function computePricing(product = {}) {
  const orientation =
    product?.orientation === "landscape" ? "landscape" : "portrait";
  const dimensions = ORIENTATION_DIMENSIONS[orientation];

  const physicalDiscount = clampPercentage(product?.physicalDiscount, 0);
  const digitalDiscount = clampPercentage(product?.digitalDiscount, 0);

  const physicalBasePrices = computePhysicalBasePrices(product);

  const physicalOptions = SIZE_KEYS.map((key) => {
    const basePrice = toPrice(
      physicalBasePrices[key],
      DEFAULT_PHYSICAL_PRICES[key]
    );
    const finalPrice = applyDiscount(basePrice, physicalDiscount);
    return {
      key,
      label: key,
      dimensions: dimensions[key],
      size: dimensions[key],
      basePrice,
      finalPrice,
    };
  });

  const physicalPricing = physicalOptions.reduce((acc, option) => {
    acc[option.dimensions] = {
      label: option.label,
      basePrice: option.basePrice,
      finalPrice: option.finalPrice,
    };
    return acc;
  }, {});

  const defaultPhysicalOption = physicalOptions[0];

  const digitalBasePrice = toPrice(product?.digitalPrice, DEFAULT_DIGITAL_PRICE, {
    allowZero: true,
  });

  const normalizedDigitalBase =
    digitalBasePrice != null && digitalBasePrice >= 0
      ? digitalBasePrice
      : DEFAULT_DIGITAL_PRICE;

  const digitalFinalPrice = applyDiscount(normalizedDigitalBase, digitalDiscount);

  return {
    orientation,
    dimensions,
    physicalDiscount,
    digitalDiscount,
    physicalBasePrices,
    physicalOptions,
    physicalPricing,
    defaultPhysicalDimensions: defaultPhysicalOption?.dimensions,
    defaultPhysicalBasePrice: defaultPhysicalOption?.basePrice ?? DEFAULT_PHYSICAL_PRICES.M,
    defaultPhysicalFinalPrice:
      defaultPhysicalOption?.finalPrice ?? DEFAULT_PHYSICAL_PRICES.M,
    digitalBasePrice: normalizedDigitalBase,
    digitalFinalPrice,
  };
}

export function augmentProductWithPricing(product = {}) {
  const pricing = computePricing(product);

  const productId =
    product?.productId ??
    (typeof product?._id === "object" && product?._id !== null
      ? product._id.toString()
      : product?._id ?? "");

  const normalized = {
    ...product,
    productId,
    pricing,
    price: pricing.defaultPhysicalBasePrice,
    finalPrice: pricing.defaultPhysicalFinalPrice,
    salePrice: pricing.physicalDiscount > 0 ? pricing.defaultPhysicalFinalPrice : null,
    digitalDisplayPrice: pricing.digitalFinalPrice,
    defaultPhysicalDimensions:
      pricing.defaultPhysicalDimensions ?? ORIENTATION_DIMENSIONS.portrait.M,
    physicalPricing: pricing.physicalPricing,
    physicalOptions: pricing.physicalOptions,
  };

  return normalized;
}
