import crypto from "crypto";
import { cookies } from "next/headers";

const SECRET = process.env.GUEST_TOKEN_SECRET || "changeme";
const VALID = /^guest_[A-Za-z0-9_-]{10,}$/;

export function signGuestId(guestId) {
  if (!VALID.test(guestId)) {
    throw new Error("Invalid guestId format");
  }
  const sig = crypto.createHmac("sha256", SECRET).update(guestId).digest("base64url");
  return `${guestId}.${sig}`;
}

export function verifySignedGuestId(signed) {
  if (!signed || !signed.includes(".")) return null;
  const [id, sig] = signed.split(".");
  if (!VALID.test(id)) return null;
  const expected = crypto.createHmac("sha256", SECRET).update(id).digest("base64url");
  try {
    if (crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return id;
    }
  } catch {
    return null;
  }
  return null;
}

export function setGuestCookie(guestId) {
  const value = signGuestId(guestId);
  cookies().set("gid", value, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}
