const isExpired = (expiresAt) => {
  if (!expiresAt) return false;
  const expiryDate = new Date(expiresAt);
  if (Number.isNaN(expiryDate.getTime())) {
    return false;
  }
  return expiryDate.getTime() < Date.now();
};

const normalizePromoScope = (appliesTo) => {
  if (appliesTo === "digital" || appliesTo === "physical") {
    return appliesTo;
  }
  return "all";
};

const normalizeItemFormat = (format) => {
  return String(format || "physical").toLowerCase() === "digital"
    ? "digital"
    : "physical";
};

const getScopeLabel = (scope) => {
  if (scope === "digital") return "digital products";
  if (scope === "physical") return "physical posters";
  return "all products";
};

export const applyPromo = (cart = {}, promo = {}) => {
  if (!cart || typeof cart !== "object") {
    return { valid: false, message: "Invalid cart", discount: 0, newTotal: 0 };
  }

  if (!promo || typeof promo !== "object") {
    const shippingCost = Number(cart.shippingCost ?? 0);
    const cartValue = Number(cart.totalPrice ?? 0);
    const originalTotal = Math.max(cartValue + shippingCost, 0);
    return {
      valid: false,
      message: "Invalid promo",
      discount: 0,
      newTotal: originalTotal,
      originalTotal,
    };
  }

  if (isExpired(promo?.expiresAt)) {
    const shippingCost = Math.max(Number(cart.shippingCost ?? 0), 0);
    const cartValue = Math.max(Number(cart.totalPrice ?? 0), 0);
    const originalTotal = cartValue + shippingCost;

    return {
      valid: false,
      message: "Expired",
      discount: 0,
      newTotal: originalTotal,
      originalTotal,
    };
  }

  const { type, condition, value, minCartValue, minQuantity } = promo;
  const cartValue = Math.max(Number(cart.totalPrice ?? 0), 0);
  const shippingCost = Math.max(Number(cart.shippingCost ?? 0), 0);
  const scope = normalizePromoScope(promo?.appliesTo);
  const items = Array.isArray(cart.items) ? cart.items : [];
  const eligibleItems = items.filter((item) => {
    if (scope === "all") return true;
    return normalizeItemFormat(item?.format) === scope;
  });
  const quantity = eligibleItems.reduce(
    (sum, item) => sum + Number(item?.quantity ?? 0),
    0
  );
  const merchandiseTotal = items.reduce((sum, item) => {
    const quantity = Math.max(Number(item?.quantity ?? 0), 0);
    const lineTotal = Number(item?.lineTotal);
    if (Number.isFinite(lineTotal) && lineTotal >= 0) {
      return sum + lineTotal;
    }

    const price = Number(item?.price ?? 0);
    if (Number.isFinite(price) && price >= 0) {
      return sum + price * quantity;
    }

    return sum;
  }, 0);
  const eligibleMerchandiseTotal = eligibleItems.reduce((sum, item) => {
    const quantity = Math.max(Number(item?.quantity ?? 0), 0);
    const lineTotal = Number(item?.lineTotal);
    if (Number.isFinite(lineTotal) && lineTotal >= 0) {
      return sum + lineTotal;
    }

    const price = Number(item?.price ?? 0);
    if (Number.isFinite(price) && price >= 0) {
      return sum + price * quantity;
    }

    return sum;
  }, 0);
  const originalTotal = cartValue + shippingCost;

  if (!type) {
    return {
      valid: false,
      message: "Promo type missing",
      discount: 0,
      newTotal: originalTotal,
      originalTotal,
    };
  }

  if (type === "shipping" && scope === "digital") {
    return {
      valid: false,
      message: "Shipping promos cannot be limited to digital products",
      discount: 0,
      newTotal: originalTotal,
      originalTotal,
    };
  }

  if (scope !== "all" && eligibleItems.length === 0) {
    return {
      valid: false,
      message: `Promo applies to ${getScopeLabel(scope)} only`,
      discount: 0,
      newTotal: originalTotal,
      originalTotal,
    };
  }

  const eligibilityRatio =
    merchandiseTotal > 0 ? eligibleMerchandiseTotal / merchandiseTotal : 0;
  const eligibleCartValue =
    scope === "all"
      ? cartValue
      : Number((cartValue * Math.min(Math.max(eligibilityRatio, 0), 1)).toFixed(2));

  if (
    condition === "cartValue" &&
    Number(minCartValue ?? 0) > eligibleCartValue
  ) {
    return {
      valid: false,
      message: "Cart value too low",
      discount: 0,
      newTotal: originalTotal,
      originalTotal,
    };
  }

  if (condition === "quantity" && Number(minQuantity ?? 0) > quantity) {
    return {
      valid: false,
      message: `Not enough eligible items for this promo`,
      discount: 0,
      newTotal: originalTotal,
      originalTotal,
    };
  }

  let discount = 0;
  const numericValue = Number(value ?? 0);

  if (type === "flat") {
    discount = Math.max(Math.min(numericValue, eligibleCartValue), 0);
  } else if (type === "percent") {
    discount = Math.max((eligibleCartValue * numericValue) / 100, 0);
  } else if (type === "shipping") {
    discount =
      scope === "digital"
        ? 0
        : shippingCost;
  }

  if (!Number.isFinite(discount)) {
    discount = 0;
  }

  const cappedDiscount = Math.min(discount, originalTotal);
  const newTotal = Math.max(originalTotal - cappedDiscount, 0);

  return {
    valid: true,
    discount: Number(cappedDiscount.toFixed(2)),
    newTotal: Number(newTotal.toFixed(2)),
    originalTotal: Number(originalTotal.toFixed(2)),
    message: `Applied ${promo.code}`,
    promoCode: promo.code,
    promoType: type,
    promoValue: numericValue,
    appliesTo: scope,
  };
};
