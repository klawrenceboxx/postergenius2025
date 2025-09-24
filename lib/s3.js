import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import { Readable } from "node:stream";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const toNodeStream = (file) => {
  if (!file || typeof file.stream !== "function") {
    return null;
  }

  try {
    const webStream = file.stream();
    if (!webStream) return null;

    if (typeof Readable.fromWeb === "function") {
      return Readable.fromWeb(webStream);
    }

    const reader = webStream.getReader();
    return new Readable({
      async read() {
        try {
          const { done, value } = await reader.read();
          if (done) {
            this.push(null);
          } else {
            this.push(Buffer.from(value));
          }
        } catch (error) {
          this.destroy(error);
        }
      },
    });
  } catch (error) {
    console.warn("Failed to create readable stream for upload", error);
    return null;
  }
};

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
    return { key: null };
  }

  const fileName = file.name || "upload";
  const extension = fileName.includes(".")
    ? fileName.substring(fileName.lastIndexOf(".") + 1)
    : "";
  const safeExtension = extension ? `.${extension}` : "";
  const key = `${keyPrefix}/${Date.now()}-${crypto.randomUUID()}${safeExtension}`;

  const bodyStream = toNodeStream(file);
  const body = bodyStream || Buffer.from(await file.arrayBuffer());

  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: file.type || "application/octet-stream",
  });

  await s3.send(command);

  return { key };
};

export const deleteFileFromS3 = async (key) => {
  if (!key) return false;

  try {
    const command = new DeleteObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
    });
    await s3.send(command);
    return true;
  } catch (error) {
    console.error("Failed to delete S3 object", error);
    return false;
  }
};

export default s3;
