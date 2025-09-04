const buckets = new Map();

export function allow(key, limit = 10, windowMs = 60 * 1000) {
  const now = Date.now();
  const bucket = buckets.get(key) || { ts: now, used: 0 };
  if (now - bucket.ts > windowMs) {
    bucket.ts = now;
    bucket.used = 0;
  }
  bucket.used += 1;
  buckets.set(key, bucket);
  return bucket.used <= limit;
}
