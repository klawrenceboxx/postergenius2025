const ALLOWED_DIGITAL_FILE_EXTENSIONS = new Set([
  "pdf",
  "zip",
  "png",
  "jpg",
  "jpeg",
]);

const ALLOWED_DIGITAL_FILE_MIME_TYPES = new Set([
  "application/pdf",
  "application/zip",
  "application/x-zip",
  "application/x-zip-compressed",
  "application/octet-stream",
  "image/png",
  "image/jpeg",
]);

const MAX_DIGITAL_FILE_SIZE_BYTES = 200 * 1024 * 1024; // 200MB limit

const isFileLike = (file) =>
  file && typeof file === "object" && typeof file.arrayBuffer === "function";

export const validateDigitalFile = (file) => {
  if (!isFileLike(file)) {
    return { ok: false, error: "Invalid file provided" };
  }

  const size = typeof file.size === "number" ? file.size : Number(file.size);
  if (Number.isFinite(size) && size > MAX_DIGITAL_FILE_SIZE_BYTES) {
    return {
      ok: false,
      error: "Digital files must be 200MB or smaller",
    };
  }

  const fileName = file.name || "";
  const extension = fileName.includes(".")
    ? fileName.split(".").pop().toLowerCase()
    : "";
  const mimeType = (file.type || "").toLowerCase();

  const hasAllowedExtension = extension
    ? ALLOWED_DIGITAL_FILE_EXTENSIONS.has(extension)
    : false;
  const hasAllowedMimeType = mimeType
    ? ALLOWED_DIGITAL_FILE_MIME_TYPES.has(mimeType)
    : false;

  if (!hasAllowedExtension && !hasAllowedMimeType) {
    return {
      ok: false,
      error: "Only PDF, ZIP, PNG, or JPG files are supported",
    };
  }

  return { ok: true, extension, mimeType };
};

export const DIGITAL_FILE_LIMITS = {
  allowedExtensions: ALLOWED_DIGITAL_FILE_EXTENSIONS,
  allowedMimeTypes: ALLOWED_DIGITAL_FILE_MIME_TYPES,
  maxSizeBytes: MAX_DIGITAL_FILE_SIZE_BYTES,
};
