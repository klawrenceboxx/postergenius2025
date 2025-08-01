import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export const getDownloadUrl = async (key, expiresIn = 3600) => {
  // 🔑 Always append .png for now (CHANGE THIS TO .zip LATER if needed)
  const fileName = `${key}.png`;

  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    ResponseContentDisposition: `attachment; filename="${encodeURIComponent(
      fileName
    )}"`,
  });
  return await getSignedUrl(s3, command, { expiresIn });
};

export default s3;
