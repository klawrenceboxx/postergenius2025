const CDN_BASE_URL =
  process.env.CDN_BASE_URL ||
  process.env.NEXT_PUBLIC_CDN_BASE_URL ||
  process.env.CDN_URL ||
  process.env.CLOUDFRONT_URL ||
  process.env.CLOUDFRONT_DOMAIN ||
  null;

const S3_BUCKET = process.env.S3_BUCKET_NAME;
const S3_REGION = process.env.AWS_REGION;

function buildFromS3Key(key) {
  if (!key || typeof key !== "string") return null;

  let objectKey = key.trim();
  if (!objectKey) return null;

  if (/^s3:\/\//i.test(objectKey)) {
    objectKey = objectKey.replace(/^s3:\/\//i, "");
  }

  if (/^https?:\/\//i.test(objectKey)) {
    try {
      const url = new URL(objectKey);
      objectKey = url.pathname.replace(/^\/+/, "");
    } catch (error) {
      objectKey = objectKey.replace(/^https?:\/\//i, "");
      const slashIndex = objectKey.indexOf("/");
      objectKey = slashIndex >= 0 ? objectKey.slice(slashIndex + 1) : objectKey;
    }
  }

  if (objectKey.includes(".amazonaws.com/")) {
    objectKey = objectKey.split(".amazonaws.com/")[1] || "";
  }

  objectKey = objectKey.replace(/^\/+/, "");
  if (!objectKey) return null;

  if (CDN_BASE_URL) {
    return `${CDN_BASE_URL.replace(/\/$/, "")}/${objectKey}`;
  }

  if (S3_BUCKET && S3_REGION) {
    return `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${objectKey}`;
  }

  return null;
}

export function toCdnUrl(source) {
  if (!source) return null;

  if (typeof source === "object" && source !== null) {
    return null;
  }

  const value = String(source).trim();
  if (!value) return null;

  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      const hostname = url.hostname.toLowerCase();
      if (CDN_BASE_URL && hostname.includes(".s3.")) {
        const key = url.pathname.replace(/^\//, "");
        return `${CDN_BASE_URL.replace(/\/$/, "")}/${key}`;
      }
    } catch (error) {
      // Ignore parsing errors and fall through
    }
    return value;
  }

  return buildFromS3Key(value);
}

export function ensureProductCdnUrl(product) {
  if (!product) return null;
  if (product.cdnUrl) return product.cdnUrl;

  const candidate =
    product.s3Url ||
    product.primaryImageKey ||
    (Array.isArray(product.image) ? product.image[0] : null) ||
    product.digitalFileUrl ||
    null;

  if (!candidate) {
    const id = product._id || product.id || "unknown";
    console.warn(
      `[Printful] Product ${id} is missing a cdnUrl and no S3 reference was found.`
    );
    return null;
  }

  const cdnUrl = toCdnUrl(candidate);
  if (!cdnUrl) {
    const id = product._id || product.id || "unknown";
    console.warn(
      `[Printful] Unable to derive cdnUrl for product ${id} from ${candidate}.`
    );
    return null;
  }

  product.cdnUrl = cdnUrl;
  return cdnUrl;
}
