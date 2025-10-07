import { NextResponse } from "next/server";
import connectDB from "@/config/db";
import Promo from "@/models/PromoModel";
import { applyPromo } from "@/lib/promoCode";

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 10;

const getRateLimitStore = () => {
  if (!globalThis.__promoRateLimitStore) {
    globalThis.__promoRateLimitStore = new Map();
  }
  return globalThis.__promoRateLimitStore;
};

const getClientId = (request) => {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const [first] = forwardedFor.split(",");
    if (first) return first.trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return request.headers.get("user-agent") || "unknown";
};

const isRateLimited = (request, code) => {
  const store = getRateLimitStore();
  const clientId = getClientId(request);
  const key = `${clientId}:${code?.toLowerCase() ?? ""}`;
  const now = Date.now();

  const entry = store.get(key);

  if (!entry || entry.expiresAt <= now) {
    store.set(key, { count: 1, expiresAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (entry.count >= RATE_LIMIT_MAX_ATTEMPTS) {
    return true;
  }

  entry.count += 1;
  store.set(key, entry);
  return false;
};

export async function POST(request) {
  try {
    const { code, cart } = await request.json();

    if (!code) {
      return NextResponse.json(
        { valid: false, message: "Promo code required" },
        { status: 400 }
      );
    }

    if (isRateLimited(request, code)) {
      return NextResponse.json(
        { valid: false, message: "Too many attempts" },
        { status: 429 }
      );
    }

    await connectDB();

    const promo = await Promo.findOne({ code: code.trim(), isActive: true }).lean();

    if (!promo) {
      return NextResponse.json({ valid: false, message: "Invalid code" });
    }

    if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) {
      return NextResponse.json({ valid: false, message: "Expired" });
    }

    const result = applyPromo(cart, promo);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Promo Validate Error:", error);
    return NextResponse.json(
      { valid: false, message: "Server error" },
      { status: 500 }
    );
  }
}
