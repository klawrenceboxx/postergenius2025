// lib/s3.js
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand, // 👈 add this
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";

const buildPublicUrl = (key) => {
  if (!key) return null;
  const bucket = process.env.S3_BUCKET_NAME;
  const region = process.env.AWS_REGION;

  if (!bucket || !region) return null;
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
};

// fallback map for common extensions
const EXTENSION_TO_MIME = {
  zip: "application/zip",
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export const getDownloadUrl = async (
  key,
  { expiresIn = 3600, downloadName } = {}
) => {
  if (!key) return null;

  const fallbackName = key.split("/").pop();
  const fileName = downloadName || fallbackName;

  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    ResponseContentDisposition: fileName
      ? `attachment; filename="${encodeURIComponent(fileName)}"`
      : undefined,
  });
  return await getSignedUrl(s3, command, { expiresIn });
};

export const uploadFileToS3 = async (file, { keyPrefix = "products" } = {}) => {
  if (!file || typeof file.arrayBuffer !== "function") {
    return { key: null, url: null };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = file.name || "upload";
  const extension = fileName.includes(".")
    ? fileName.substring(fileName.lastIndexOf(".") + 1).toLowerCase()
    : "";

  const safeExtension = extension ? `.${extension}` : "";
  const key = `${keyPrefix}/${Date.now()}-${crypto.randomUUID()}${safeExtension}`;

  // pick MIME type from file.type or fallback map
  const contentType =
    file.type || EXTENSION_TO_MIME[extension] || "application/octet-stream";

  // debug logs
  console.log("Uploading file:", fileName);
  console.log("Detected extension:", extension);
  console.log("Detected contentType:", contentType);

  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  try {
    await s3.send(command);
  } catch (err) {
    console.error("S3 upload failed for:", fileName, err);
    throw err;
  }

  return {
    key,
    url: buildPublicUrl(key),
  };
};

// 👇 New delete function
export const deleteFileFromS3 = async (key) => {
  if (!key) return false;

  const command = new DeleteObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
  });

  try {
    await s3.send(command);
    console.log(`Deleted file from S3: ${key}`);
    return true;
  } catch (err) {
    console.error("S3 delete failed for:", key, err);
    return false;
  }
};

export default s3;
