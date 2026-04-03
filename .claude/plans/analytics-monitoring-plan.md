# PosterGenius Analytics & Monitoring — Implementation Plan

> Created: 2026-03-28
> Status: Ready for execution
> Phases: 5 (each executable in a single agent session)

---

## Current State Summary

| Tool | Installed | Actually Working |
|------|-----------|-----------------|
| Google Analytics 4 (G-WS50WJJDNT) | ✅ | Page views only |
| Meta Pixel (1120594359291706) | ✅ | Page views only |
| Omnisend | ✅ | Page views only |
| PostHog / session recording / heatmaps | ❌ | Nothing |
| Conversion events (AddToCart, Purchase) | ❌ | Nothing |
| UTM tracking (Pinterest/Etsy attribution) | ❌ | Nothing |
| Analytics dashboard | ❌ | Nothing |

---

## Phase Dependency Map

```
Phase 1 (PostHog)        — no deps, start immediately
Phase 2 (Conversion Events) — no deps, runs alongside Phase 1
Phase 3 (UTM Tracking)   — depends on Phase 2 (shares successUrl change)
Phase 4 (Feedback Widget) — no deps, fully independent
Phase 5 (Dashboard)      — depends on Phases 1, 3, 4
```

---

## Phase 1: PostHog — Session Recording, Heatmaps, Funnels

**Objective:** Install PostHog so you immediately get heatmaps, session replays, and funnel analysis without writing any custom events.

### Files to Create
- `components/PostHogProvider.jsx`

### Files to Modify
- `app/layout.jsx` — wrap tree with `<PostHogProvider>`

### Implementation

**Install:**
```
npm install posthog-js
```

**`components/PostHogProvider.jsx`:**
```jsx
"use client";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";

function PostHogIdentifier() {
  const { user } = useUser();
  useEffect(() => {
    if (user) {
      posthog.identify(user.id, {
        email: user.primaryEmailAddress?.emailAddress,
        name: user.fullName,
      });
    } else {
      posthog.reset();
    }
  }, [user]);
  return null;
}

export default function PostHogProvider({ children }) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      capture_pageview: true,
      session_recording: { maskAllInputs: false },
      autocapture: true,
    });
  }, []);

  return (
    <PHProvider client={posthog}>
      <PostHogIdentifier />
      {children}
    </PHProvider>
  );
}
```

**`app/layout.jsx` nesting order:**
```
<ClerkProvider>
  <html>
    <body>
      <PostHogProvider>
        <Toaster />
        <AppContextProvider>
          ...
        </AppContextProvider>
      </PostHogProvider>
    </body>
  </html>
</ClerkProvider>
```

### Environment Variables
| Variable | Value |
|---|---|
| `NEXT_PUBLIC_POSTHOG_KEY` | `phc_...` from PostHog project settings |
| `NEXT_PUBLIC_POSTHOG_HOST` | `https://us.i.posthog.com` |

**Setup steps:** Create free PostHog account → new project (Web/JavaScript SDK) → copy Project API Key → Settings → Session Recording → enable.

### Verification Checklist
- [ ] Visit localhost:3000 — PostHog Live Events shows `$pageview` within 10s
- [ ] Navigate to a product page — second `$pageview` appears
- [ ] PostHog → Session Recordings — a recording appears within 1–2 min
- [ ] Sign in with Clerk — PostHog People profile shows email address
- [ ] No console errors referencing PostHog

### Anti-Patterns
- Do NOT call `posthog.init()` twice
- Do NOT set `autocapture: false` — it's what gives you heatmaps
- Do NOT skip `posthog.reset()` on logout — prevents identity bleeding

---

## Phase 2: GA4 + Meta Pixel Conversion Events

**Objective:** Fire `ViewContent`, `AddToCart`, `InitiateCheckout`, and `Purchase` to both GA4 and Meta Pixel.

### Files to Create
- `lib/analytics.js` — shared event helper

### Files to Modify
- `components/product/Infos.jsx` — ViewContent on mount
- `context/AppContext.jsx` — AddToCart after cart update succeeds
- `app/checkout/page.jsx` — InitiateCheckout on mount
- `components/OrderSummary.jsx` — InitiateCheckout for authenticated users
- `app/order-placed/page.jsx` — Purchase on mount using query param

### Implementation

**`lib/analytics.js`:**
```js
export function trackEvent(eventName, params = {}) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", eventName, params);
  }
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    window.fbq("track", eventName, params);
  }
}
```

**ViewContent — `components/product/Infos.jsx`:**
```js
useEffect(() => {
  trackEvent("ViewContent", {
    content_name: product.title,
    content_ids: [product.productId],
    content_type: "product",
    value: product.finalPrice,
    currency: "CAD",
  });
}, []);
```

**AddToCart — `context/AppContext.jsx`** (inside `addToCart()`, after cart update succeeds):
```js
import { trackEvent } from "@/lib/analytics";
// ...
trackEvent("AddToCart", {
  content_name: itemRecord.title,
  content_ids: [itemRecord.productId],
  content_type: "product",
  value: Number(itemRecord.price) * Number(itemRecord.quantity),
  currency: "CAD",
});
```

**InitiateCheckout — `app/checkout/page.jsx`:**
```js
useEffect(() => { trackEvent("InitiateCheckout", {}); }, []);
```

**Purchase — `app/order-placed/page.jsx`:**
```js
"use client";
import { useSearchParams } from "next/navigation";
// Wrap component in <Suspense> per Next.js 15 requirement
const searchParams = useSearchParams();
useEffect(() => {
  const value = parseFloat(searchParams.get("value") || "0");
  const currency = searchParams.get("currency") || "CAD";
  if (value > 0) trackEvent("Purchase", { value, currency });
}, []);
```

**`components/OrderSummary.jsx`** — append value to `success_url`:
```js
const successUrl = `${window.location.origin}/order-placed?value=${totalAfterDiscount}&currency=CAD`;
```

### Verification Checklist
- [ ] Visit product page → ViewContent fires in GA4 Realtime and Meta Events Manager
- [ ] Add to cart → AddToCart fires with correct CAD value
- [ ] Navigate to checkout → InitiateCheckout fires
- [ ] Complete test purchase → Purchase fires with correct value
- [ ] All four events visible in GA4 Realtime → Events

### Anti-Patterns
- Do NOT use `"USD"` — site sells in CAD
- Do NOT fire Purchase from the webhook — must fire client-side
- Do NOT use `[cartItems]` as dep for AddToCart — fires on every cart sync

---

## Phase 3: UTM Attribution Tracking

**Objective:** Capture UTM params from Pinterest/Etsy traffic, persist to localStorage, thread through checkout, store on Order in MongoDB.

### Files to Create
- `hooks/useUTM.js` — captures UTM on page load, persists to localStorage
- `components/UTMCapture.jsx` — thin client component called at app root

### Files to Modify
- `app/layout.jsx` — add `<UTMCapture />` inside `<AppContextProvider>`
- `components/OrderSummary.jsx` — read UTM from localStorage, include in session creation body
- `app/api/stripe/create-session/route.js` — accept UTM fields, append to Stripe metadata
- `app/api/stripe/webhook/route.js` — read UTM from `session.metadata`, write to Order
- `models/Order.js` — add utm_source, utm_medium, utm_campaign, utm_content, utm_term fields

### Implementation

**`hooks/useUTM.js`:**
```js
"use client";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

const UTM_STORAGE_KEY = "pg_utm";
const UTM_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];

export function useUTM() {
  const searchParams = useSearchParams();
  useEffect(() => {
    const hasUtm = UTM_KEYS.some((k) => searchParams.get(k));
    if (!hasUtm) return;
    const utm = {};
    UTM_KEYS.forEach((k) => { const v = searchParams.get(k); if (v) utm[k] = v; });
    utm.referrer = document.referrer || "";
    utm.capturedAt = Date.now();
    try { localStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(utm)); } catch (_) {}
  }, [searchParams]);
}

export function readStoredUTM() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(UTM_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.capturedAt > UTM_TTL_MS) {
      localStorage.removeItem(UTM_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch (_) { return null; }
}
```

**`components/UTMCapture.jsx`:**
```jsx
"use client";
import { Suspense } from "react";
import { useUTM } from "@/hooks/useUTM";

function Inner() { useUTM(); return null; }

export default function UTMCapture() {
  return <Suspense fallback={null}><Inner /></Suspense>;
}
```

**`models/Order.js`** — add after `fulfillmentError`:
```js
utm_source:   { type: String },
utm_medium:   { type: String },
utm_campaign: { type: String },
utm_content:  { type: String },
utm_term:     { type: String },
```

**`components/OrderSummary.jsx`** — before axios.post:
```js
import { readStoredUTM } from "@/hooks/useUTM";
const utm = readStoredUTM();
const body = { items, address, successUrl, cancelUrl, ...(utm ? { utm } : {}) };
```

**`app/api/stripe/create-session/route.js`** — append to metadata:
```js
const { items, address, successUrl, cancelUrl, promoCode, utm } = await request.json();
// ... existing logic ...
if (utm?.utm_source) {
  metadata.utm_source = utm.utm_source;
  if (utm.utm_medium)   metadata.utm_medium   = utm.utm_medium;
  if (utm.utm_campaign) metadata.utm_campaign = utm.utm_campaign;
}
```

**`app/api/stripe/webhook/route.js`** — in `baseOrder`:
```js
utm_source:   metadata.utm_source   || undefined,
utm_medium:   metadata.utm_medium   || undefined,
utm_campaign: metadata.utm_campaign || undefined,
```

### Verification Checklist
- [ ] Visit `/?utm_source=pinterest&utm_campaign=spring` — localStorage has `pg_utm`
- [ ] Visit again without UTM — stored UTM preserved
- [ ] Complete checkout — Stripe session metadata has `utm_source`
- [ ] MongoDB order has `utm_source: "pinterest"`

### Anti-Patterns
- Do NOT overwrite stored UTM when new visit has no UTM params
- Do NOT store UTM in React state/Context — won't survive page reloads
- Do NOT send UTM from webhook response — flow is: client → create-session → Stripe metadata → webhook reads it

---

## Phase 4: Site Feedback Widget

**Objective:** Floating feedback button that collects star ratings + optional comments, stored in MongoDB, excluded from checkout pages.

### Files to Create
- `models/Feedback.js`
- `app/api/feedback/route.js`
- `components/FeedbackWidget.jsx`

### Files to Modify
- `app/layout.jsx` — add `<FeedbackWidget />` after `<SlideInOptIn />`

### Implementation

**`models/Feedback.js`:**
```js
import mongoose from "mongoose";
const feedbackSchema = new mongoose.Schema({
  rating:    { type: Number, min: 1, max: 5, required: true },
  comment:   { type: String, trim: true, default: "" },
  pageUrl:   { type: String, trim: true },
  userId:    { type: String, default: null },
  userAgent: { type: String },
}, { timestamps: true });
const Feedback = mongoose.models.Feedback || mongoose.model("Feedback", feedbackSchema);
export default Feedback;
```

**`app/api/feedback/route.js`:**
- POST: validate rating (1–5), save to MongoDB, truncate comment to 1000 chars
- GET: auth-protected, return last 100 feedback items sorted by createdAt desc

**`components/FeedbackWidget.jsx`:**
- Fixed position: `fixed bottom-6 right-6 z-50`
- Button: `MessageCircle` icon from lucide-react
- Opens slide-up panel with: 5 star rating (clickable `Star` icons) + optional textarea + Submit
- On submit: POST to `/api/feedback` with `{ rating, comment, pageUrl: window.location.href }`
- On success: show "Thanks!" message, auto-close after 2s
- **Do NOT render on:** `/checkout`, `/order-placed`, `/order-confirmation` — use `usePathname()` check

### Verification Checklist
- [ ] Widget appears bottom-right on home, product, cart pages
- [ ] Widget does NOT appear on /checkout or /order-placed
- [ ] Submit with no rating → validation error shown
- [ ] Submit with rating → MongoDB `feedbacks` collection has document with correct pageUrl
- [ ] Form auto-closes after success

### Anti-Patterns
- Do NOT collect email in the feedback form (CASL risk — Omnisend handles this)
- Do NOT make submission block the UI

---

## Phase 5: Analytics Dashboard Page

**Objective:** `/seller/analytics` page showing conversion funnel (PostHog embed), revenue by channel, and recent feedback — all from MongoDB.

### Files to Create
- `app/seller/analytics/page.jsx`
- `app/api/analytics/summary/route.js`

### Files to Modify
- `components/seller/Sidebar.jsx` — add Analytics link to `menuItems`

### Implementation

**`app/api/analytics/summary/route.js`** — MongoDB aggregations:
```js
// Revenue by utm_source — last 90 days
const revenueBySource = await Order.aggregate([
  { $match: { createdAt: { $gte: since } } },
  { $group: {
      _id: { $ifNull: ["$utm_source", "direct"] },
      totalRevenue: { $sum: "$amount" },
      orderCount:   { $sum: 1 },
  }},
  { $sort: { totalRevenue: -1 } },
]);
// + statusCounts, totalOrders, recent feedback
```

**`app/seller/analytics/page.jsx`** — sections:
1. **Conversion Funnel** — PostHog iframe embed (`NEXT_PUBLIC_POSTHOG_FUNNEL_EMBED_URL`)
2. **Revenue by Channel** — table: Source | Orders | Revenue (CAD)
3. **Recent Feedback** — table: Rating | Comment | Page URL | Date
4. **Quick Stats strip** — Total Orders, Total Revenue, Avg Feedback Rating

Use same Tailwind patterns as `app/seller/orders/page.jsx`.

**`components/seller/Sidebar.jsx`** — add to `menuItems`:
```js
{ name: "Analytics", path: "/seller/analytics", icon: assets.order_icon }
```

### Environment Variables
| Variable | Value |
|---|---|
| `NEXT_PUBLIC_POSTHOG_FUNNEL_EMBED_URL` | PostHog Insights → Share → Embed URL |

### Verification Checklist
- [ ] "Analytics" link in sidebar, highlighted when on /seller/analytics
- [ ] Revenue by channel shows "direct" for unattributed orders and "pinterest" for UTM-tagged orders
- [ ] PostHog iframe renders funnel chart
- [ ] Recent feedback table shows submissions from Phase 4
- [ ] Page returns 401 for logged-out users

### Anti-Patterns
- Do NOT expose `/api/analytics/summary` publicly — always check `auth.userId`
- Do NOT try to build the funnel chart from scratch in MongoDB — use PostHog's embed
- Do NOT add analytics route to PUBLIC_ROUTES in middleware

---

## Key Files Quick Reference

| File | Phases |
|------|--------|
| `app/layout.jsx` | 1, 3, 4 — central integration point |
| `app/api/stripe/create-session/route.js` | 3 — UTM threaded into metadata |
| `app/api/stripe/webhook/route.js` | 3 — UTM persisted to Order |
| `models/Order.js` | 3 — schema extension |
| `context/AppContext.jsx` | 2 — AddToCart event |
| `components/seller/Sidebar.jsx` | 5 — Analytics nav link |
