const CLOUDINARY_HOST = "res.cloudinary.com";
const CLOUDINARY_UPLOAD_SEGMENT = "/upload/";
const DEFAULT_BLUR_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFgwJ/lvWM4wAAAABJRU5ErkJggg==";

const RASTER_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".jfif", ".pjpeg", ".pjp"];

function isString(value) {
  return typeof value === "string";
}

function getExtension(src) {
  if (!src) return "";
  const value = isString(src) ? src : src?.src;
  if (!isString(value)) return "";
  const pathname = value.split(/[?#]/)[0] ?? "";
  const lastDot = pathname.lastIndexOf(".");
  return lastDot === -1 ? "" : pathname.slice(lastDot).toLowerCase();
}

export function isCloudinaryUrl(src) {
  if (!isString(src)) return false;
  try {
    const url = new URL(src);
    return url.hostname === CLOUDINARY_HOST && src.includes(CLOUDINARY_UPLOAD_SEGMENT);
  } catch (error) {
    return false;
  }
}

function buildTransformSegment(variant) {
  const baseTransforms = ["f_auto", "q_auto"];

  if (variant === "thumbnail" || variant === "detail") {
    if (!baseTransforms.includes("c_fill")) {
      baseTransforms.push("c_fill");
    }

    const widthTransform = variant === "thumbnail" ? "w_400" : "w_1200";
    baseTransforms.push(widthTransform);
  }

  return baseTransforms.join(",");
}

export function transformCloudinaryUrl(src, variant = "default") {
  if (!isCloudinaryUrl(src)) {
    return src;
  }

  const uploadIndex = src.indexOf(CLOUDINARY_UPLOAD_SEGMENT);
  if (uploadIndex === -1) {
    return src;
  }

  const prefix = src.slice(0, uploadIndex + CLOUDINARY_UPLOAD_SEGMENT.length);
  const remainder = src.slice(uploadIndex + CLOUDINARY_UPLOAD_SEGMENT.length);

  if (!remainder) {
    return src;
  }

  const [firstSegment, ...restSegments] = remainder.split("/");
  const hasTransforms = firstSegment && !firstSegment.startsWith("v");
  const transformPieces = buildTransformSegment(variant).split(",");

  if (!hasTransforms) {
    const newTransform = transformPieces.join(",");
    if (src.includes(`/upload/${newTransform}/`)) {
      return src;
    }

    return `${prefix}${newTransform}/${remainder}`;
  }

  const existingTransforms = firstSegment.split(",");
  const filteredTransforms = existingTransforms.filter((piece) => {
    if (!piece) return false;
    const normalized = piece.trim();
    if (normalized.startsWith("w_")) {
      return variant === "default";
    }
    if (variant !== "default" && normalized === "c_fill") {
      return false;
    }
    if (["f_auto", "q_auto"].includes(normalized)) {
      return false;
    }
    return true;
  });

  transformPieces.forEach((piece) => {
    if (!filteredTransforms.some((existing) => existing === piece)) {
      filteredTransforms.push(piece);
    }
  });

  const updatedTransform = filteredTransforms.join(",");
  const rest = restSegments.join("/");
  return rest
    ? `${prefix}${updatedTransform}/${rest}`
    : `${prefix}${updatedTransform}`;
}

export function getOptimizedImageProps(src, options = {}) {
  const { variant = "default", blurDataURL } = options;
  const optimizedSrc = isString(src)
    ? transformCloudinaryUrl(src, variant)
    : src;

  const extension = getExtension(optimizedSrc);
  const isRaster = RASTER_EXTENSIONS.includes(extension);

  const hasBuiltInBlur =
    typeof optimizedSrc === "object" && optimizedSrc !== null && "blurDataURL" in optimizedSrc;

  const finalBlur = blurDataURL || (hasBuiltInBlur ? optimizedSrc.blurDataURL : undefined);

  const canUseBlur = Boolean(finalBlur) || (isRaster && isString(optimizedSrc));

  return {
    src: optimizedSrc,
    loading: "lazy",
    ...(canUseBlur
      ? {
          placeholder: "blur",
          blurDataURL: finalBlur || DEFAULT_BLUR_DATA_URL,
        }
      : {}),
  };
}

export { DEFAULT_BLUR_DATA_URL };
