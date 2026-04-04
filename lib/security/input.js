const TAG_RE = /<[^>]*>/g;
const CONTROL_RE = /[\u0000-\u001F\u007F]/g;
const MULTISPACE_RE = /\s+/g;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function stripUnsafeCharacters(value) {
  return String(value)
    .replace(TAG_RE, " ")
    .replace(/[<>]/g, "")
    .replace(CONTROL_RE, " ")
    .trim();
}

function clampLength(value, maxLength) {
  if (!maxLength || value.length <= maxLength) {
    return value;
  }

  return value.slice(0, maxLength).trim();
}

export function sanitizePlainText(
  value,
  { maxLength = 200, preserveWhitespace = false } = {}
) {
  if (value === undefined || value === null) {
    return "";
  }

  const sanitized = stripUnsafeCharacters(value);
  const normalized = preserveWhitespace
    ? sanitized
    : sanitized.replace(MULTISPACE_RE, " ");

  return clampLength(normalized, maxLength);
}

export function sanitizeMultilineText(value, { maxLength = 2000 } = {}) {
  if (value === undefined || value === null) {
    return "";
  }

  const sanitized = stripUnsafeCharacters(value)
    .split(/\r?\n/)
    .map((line) => line.replace(MULTISPACE_RE, " ").trim())
    .filter(Boolean)
    .join("\n");

  return clampLength(sanitized, maxLength);
}

export function sanitizeEmail(value) {
  const email = sanitizePlainText(value, { maxLength: 320 }).toLowerCase();
  return EMAIL_RE.test(email) ? email : "";
}

export function sanitizeIdentifier(value, { maxLength = 128 } = {}) {
  const sanitized = sanitizePlainText(value, { maxLength });
  return sanitized.replace(/[^a-zA-Z0-9:_-]/g, "");
}

export function sanitizeEnum(value, allowedValues = [], fallback = "") {
  const normalized = sanitizePlainText(value, { maxLength: 64 }).toLowerCase();
  return allowedValues.includes(normalized) ? normalized : fallback;
}

export function sanitizeNumber(
  value,
  { min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY, fallback = 0 } = {}
) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(parsed, min), max);
}

export function sanitizeBoolean(value, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "on", "yes"].includes(normalized)) return true;
    if (["false", "0", "off", "no"].includes(normalized)) return false;
  }

  return fallback;
}

export function sanitizeRelativeOrAbsoluteUrl(value, fallback = "") {
  if (!value) {
    return fallback;
  }

  const raw = String(value).trim();
  if (raw.startsWith("/")) {
    return raw;
  }

  try {
    const url = new URL(raw);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.toString();
    }
  } catch {
    return fallback;
  }

  return fallback;
}
