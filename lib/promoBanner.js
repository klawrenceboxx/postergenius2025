const normalizeScope = (value) => {
  if (value === "digital" || value === "physical") {
    return value;
  }
  return "all";
};

export const formatPromoValue = (promo = {}) => {
  const type = promo?.type;
  const rawValue = Number(promo?.value ?? 0);
  const value = Number.isFinite(rawValue) ? rawValue : 0;

  if (type === "shipping") return "Free shipping";
  if (type === "percent") return `${Math.round(value)}% off`;
  if (type === "flat") return `$${value.toFixed(value % 1 === 0 ? 0 : 2)} off`;
  return "";
};

export const getPromoAudienceLabel = (promo = {}) => {
  const scope = normalizeScope(promo?.appliesTo);
  if (scope === "digital") return "digital downloads";
  if (scope === "physical") return "physical posters";
  return "all posters";
};

export const buildBannerMessage = (promo = {}) => {
  const valueLabel = formatPromoValue(promo);
  const audienceLabel = getPromoAudienceLabel(promo);
  const code = promo?.code ? String(promo.code).toUpperCase() : "";

  if (!valueLabel || !code) return "";

  if (promo?.type === "shipping") {
    return `${valueLabel} on ${audienceLabel}. Use code: ${code}`;
  }

  return `${valueLabel} on ${audienceLabel}. Use code: ${code}`;
};

export const serializeBannerPromo = (promo) => {
  if (!promo) return null;

  return {
    code: promo.code,
    type: promo.type,
    value: Number(promo.value ?? 0),
    appliesTo: normalizeScope(promo.appliesTo),
    expiresAt: promo.expiresAt ?? null,
    isActive: Boolean(promo.isActive),
    showInBanner: Boolean(promo.showInBanner),
    bannerMessage: buildBannerMessage(promo),
    audienceLabel: getPromoAudienceLabel(promo),
    valueLabel: formatPromoValue(promo),
  };
};
