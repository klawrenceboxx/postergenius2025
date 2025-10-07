const isExpired = (expiresAt) => {
  if (!expiresAt) return false;
  const expiryDate = new Date(expiresAt);
  if (Number.isNaN(expiryDate.getTime())) {
    return false;
  }
  return expiryDate.getTime() < Date.now();
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
  const quantity = Array.isArray(cart.items)
    ? cart.items.reduce((sum, item) => sum + Number(item?.quantity ?? 0), 0)
    : 0;
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

  if (condition === "cartValue" && Number(minCartValue ?? 0) > cartValue) {
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
      message: "Not enough items",
      discount: 0,
      newTotal: originalTotal,
      originalTotal,
    };
  }

  let discount = 0;
  const numericValue = Number(value ?? 0);

  if (type === "flat") {
    discount = Math.max(numericValue, 0);
  } else if (type === "percent") {
    discount = Math.max((originalTotal * numericValue) / 100, 0);
  } else if (type === "shipping") {
    discount = shippingCost;
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
  };
};
