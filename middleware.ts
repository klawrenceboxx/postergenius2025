import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

type RateLimitConfig = {
  windowMs: number;
  max: number;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const API_SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy":
    "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()",
  "Cache-Control": "no-store",
};

const DEFAULT_MUTATION_LIMIT: RateLimitConfig = {
  windowMs: 60 * 1000,
  max: 60,
};

const RATE_LIMITS: Array<{ matcher: RegExp; config: RateLimitConfig }> = [
  { matcher: /^\/api\/contact$/, config: { windowMs: 15 * 60 * 1000, max: 5 } },
  {
    matcher: /^\/api\/omnisend\/subscribe$/,
    config: { windowMs: 60 * 60 * 1000, max: 5 },
  },
  {
    matcher: /^\/api\/(checkout\/session|stripe\/create-session|order\/create)$/,
    config: { windowMs: 10 * 60 * 1000, max: 10 },
  },
  {
    matcher: /^\/api\/(reviews|guest\/save-address)$/,
    config: { windowMs: 15 * 60 * 1000, max: 20 },
  },
  {
    matcher: /^\/api\/(cart\/add|cart\/update|cart\/delete|wishlist\/update)$/,
    config: { windowMs: 60 * 1000, max: 40 },
  },
];

const EXEMPT_PATHS = [
  "/api/stripe/webhook",
  "/api/printful/webhook",
  "/api/printful/webhook/retry",
  "/api/inngest",
];

declare global {
  var __posterGeniusRateLimitStore: Map<string, RateLimitEntry> | undefined;
}

const rateLimitStore =
  globalThis.__posterGeniusRateLimitStore ?? new Map<string, RateLimitEntry>();

if (!globalThis.__posterGeniusRateLimitStore) {
  globalThis.__posterGeniusRateLimitStore = rateLimitStore;
}

function withSecurityHeaders(response: NextResponse) {
  Object.entries(API_SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

function getClientIdentifier(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  return forwardedFor?.split(",")[0]?.trim() || realIp || "unknown";
}

function getRateLimitConfig(pathname: string) {
  const routeConfig = RATE_LIMITS.find(({ matcher }) => matcher.test(pathname));
  return routeConfig?.config ?? DEFAULT_MUTATION_LIMIT;
}

function shouldRateLimit(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/api/")) {
    return false;
  }

  if (!["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {
    return false;
  }

  return !EXEMPT_PATHS.some((path) => request.nextUrl.pathname.startsWith(path));
}

function consumeRateLimit(key: string, config: RateLimitConfig) {
  const now = Date.now();

  for (const [storedKey, entry] of rateLimitStore.entries()) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(storedKey);
    }
  }

  const existing = rateLimitStore.get(key);
  if (!existing || existing.resetAt <= now) {
    const nextEntry = { count: 1, resetAt: now + config.windowMs };
    rateLimitStore.set(key, nextEntry);
    return { allowed: true, remaining: config.max - 1, resetAt: nextEntry.resetAt };
  }

  if (existing.count >= config.max) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  rateLimitStore.set(key, existing);

  return {
    allowed: true,
    remaining: Math.max(config.max - existing.count, 0),
    resetAt: existing.resetAt,
  };
}

export default clerkMiddleware(async (_auth, request) => {
  if (shouldRateLimit(request)) {
    const identifier = getClientIdentifier(request);
    const config = getRateLimitConfig(request.nextUrl.pathname);
    const rateLimit = consumeRateLimit(
      `${request.method}:${request.nextUrl.pathname}:${identifier}`,
      config
    );

    if (!rateLimit.allowed) {
      const retryAfterSeconds = Math.max(
        Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
        1
      );

      return withSecurityHeaders(
        NextResponse.json(
          {
            success: false,
            message: "Too many API requests. Please try again shortly.",
          },
          {
            status: 429,
            headers: {
              "Retry-After": String(retryAfterSeconds),
            },
          }
        )
      );
    }
  }

  const response = NextResponse.next();

  if (request.nextUrl.pathname.startsWith("/api/")) {
    withSecurityHeaders(response);
  }

  return response;
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
