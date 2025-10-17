const S3_ORIGIN = "https://postergenius-poster-downloads.s3.us-east-2.amazonaws.com";
const CDN_ORIGIN = "https://d1mhf9senw3mzj.cloudfront.net";

export const S3_BASE_URL = S3_ORIGIN;
export const CDN_BASE_URL = CDN_ORIGIN;

export function toCdnUrl(url) {
  if (!url || typeof url !== "string") {
    return null;
  }

  if (url.startsWith(CDN_ORIGIN)) {
    return url;
  }

  if (url.startsWith(S3_ORIGIN)) {
    return `${CDN_ORIGIN}${url.substring(S3_ORIGIN.length)}`;
  }

  return url;
}

export function isS3Url(url) {
  return typeof url === "string" && url.startsWith(S3_ORIGIN);
}

export default {
  toCdnUrl,
  isS3Url,
  S3_BASE_URL,
  CDN_BASE_URL,
};
