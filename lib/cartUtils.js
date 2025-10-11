const buildCanonicalKey = (item = {}, fallbackKey = "") => {
  const productId = item.productId || fallbackKey || "";
  const format = item.format || "";
  const dimensions = item.dimensions || "";
  return `${productId}__${format}__${dimensions}`;
};

const coerceQuantity = (value) => {
  const quantity = Number(value ?? 0);
  if (Number.isNaN(quantity) || !Number.isFinite(quantity)) {
    return 0;
  }
  return quantity;
};

const normalizeCartEntry = (key, value) => {
  if (!value || typeof value !== "object") {
    const quantity = coerceQuantity(value);
    if (quantity <= 0) return null;
    return {
      productId: key,
      quantity,
    };
  }

  const normalized = { ...value };
  normalized.productId = normalized.productId || key;
  normalized.quantity = coerceQuantity(normalized.quantity || 0);

  if (normalized.quantity <= 0) {
    return null;
  }

  return normalized;
};

export function mergeCartItems(userItems = {}, guestItems = {}) {
  const mergedMap = new Map();

  const addItems = (items) => {
    if (!items || typeof items !== "object") return;

    for (const [key, value] of Object.entries(items)) {
      const normalized = normalizeCartEntry(key, value);
      if (!normalized) continue;

      const canonicalKey = buildCanonicalKey(normalized, key);

      if (!mergedMap.has(canonicalKey)) {
        mergedMap.set(canonicalKey, {
          key,
          item: { ...normalized },
        });
        continue;
      }

      const existing = mergedMap.get(canonicalKey);
      const nextQuantity =
        coerceQuantity(existing.item.quantity) + coerceQuantity(normalized.quantity);

      existing.item = {
        ...normalized,
        ...existing.item,
        quantity: nextQuantity,
      };
    }
  };

  addItems(userItems);
  addItems(guestItems);

  const result = {};
  for (const { key, item } of mergedMap.values()) {
    if (!item || coerceQuantity(item.quantity) <= 0) continue;
    result[key] = {
      ...item,
      quantity: coerceQuantity(item.quantity),
    };
  }

  return result;
}

export default {
  mergeCartItems,
};
