# PosterGenius — Claude Code Assistant

## What This Is

PosterGenius (postergenius.ca) is a print-on-demand e-commerce platform that sells:
- **Digital poster downloads** — instant delivery via AWS S3 presigned URLs
- **Physical posters** — printed and shipped via Printful (POD)

Multi-vendor marketplace: sellers can list products, manage orders, and view reviews through a seller dashboard.

## Context Files

@.claude/context/business.md
@.claude/context/etsy.md
@.claude/context/pinterest.md
@.claude/context/cloudinary.md

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router, Turbopack) |
| Frontend | React 19, Tailwind CSS 3.4, Lucide icons |
| Database | MongoDB (Mongoose 8) |
| Auth | Clerk (middleware at `middleware.ts`) |
| Payments | Stripe (checkout + webhooks) |
| Fulfillment | Printful API (POD + shipping rates) |
| Media | Cloudinary (images) + AWS S3 (digital downloads) |
| Events | Inngest (async webhooks/event queue) |
| Email | Nodemailer (SMTP) + Omnisend |
| Search | Fuse.js (client-side fuzzy search) |
| State | React Context (Redux removed Mar 2026) |

## Key Files

```
app/api/                         # All server-side logic (API routes)
  ├── stripe/                    # Stripe checkout + webhook
  ├── printful/                  # Printful orders, variants, shipping, webhooks
  ├── order/                     # Order management
  ├── product/                   # Product CRUD
  ├── user/                      # User profiles + addresses
  ├── cart/                      # Shopping cart
  ├── checkout/                  # Checkout flow
  ├── download-link/             # S3 presigned download URLs
  ├── reviews/                   # Product reviews
  └── wishlist/                  # Wishlists

lib/printful.js                  # Printful API wrapper (main integration)
lib/s3.js                        # AWS S3 utilities (digital download storage)
lib/pricing.js                   # Pricing logic
lib/promoCode.js                 # Promo code validation
lib/metaPixel.js                 # Meta Pixel tracking

models/                          # MongoDB schemas (10 models)
  Product.js, Order.js, User.js, Cart.js, Review.js,
  Wishlist.js, Address.js, GuestAddress.js, PromoModel.js, WebhookFailure.js

config/db.js                     # MongoDB connection
config/printfulVariants.js       # Printful size variant ID mapping
config/inngest.js                # Inngest event queue setup

context/AppContext.jsx           # Global app state (React Context)
middleware.ts                    # Clerk auth middleware
.env                             # All credentials — NEVER commit
```

## Printful Variant IDs (hardcoded)

| Size | Variant ID |
|------|-----------|
| 12×18 | `68e1c9cb819f12` |
| 18×24 | `68e1c9cb819fb4` |
| 24×36 | `68e1c9cb81a046` |

See `config/printfulVariants.js` and `lib/printful.js`.

## Commands

```bash
npm run dev        # Dev server (Turbopack) — http://localhost:3000
npm run build      # Production build
npm start          # Start production server
npm run lint       # ESLint
```

## Required Environment Variables

All vars are set in Vercel production (project: `postergenius2025`, ID: `prj_J4UYaakI1yl7KBHROEqSlnIPpyGT`).

| Var | Notes |
|-----|-------|
| `MONGODB_URI` | Atlas cluster0 |
| `STRIPE_SECRET_KEY` | **Live mode** (`sk_live_...`) |
| `STRIPE_WEBHOOK_SECRET` | ⚠️ Needs updating — register live webhook at postergenius.ca/api/stripe/webhook in Stripe dashboard, then paste new `whsec_...` here |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | **Live mode** (`pk_live_...`) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | **Live mode** (`pk_live_...`) |
| `CLERK_SECRET_KEY` | **Live mode** (`sk_live_...`) |
| `PRINTFUL_API_KEY` | Store ID: 16958262 |
| `PRINTFUL_STORE_ID` | 16958262 |
| `PRINTFUL_DEFAULT_COUNTRY` | CA |
| `CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET` | Set |
| `AWS_ACCESS_KEY_ID/SECRET/REGION` | us-east-2 |
| `S3_BUCKET_NAME` | postergenius-poster-downloads (use this name, NOT AWS_S3_BUCKET) |
| `NEXT_PUBLIC_URL` | https://postergenius.ca |
| `INNGEST_SIGNING_KEY/EVENT_KEY` | Production keys |
| `SMTP_HOST/PORT/USER/PASS` | Gmail SMTP |
| `INTERNAL_API_SECRET` | Set |
| `OMNISEND_API_KEY` | Set |
| `GUEST_TOKEN_SECRET` | Set |

## Git

- **Remote:** https://github.com/klawrenceboxx/postergenius2025.git
- **Branch:** main
- **Last commit:** `4ce98de` — Pre-launch fixes (bugs, security, perf)

## Agents

Use `.claude/agents/` for specialized tasks:

| Agent | When to use |
|-------|-------------|
| `code-reviewer` | Review any file for correctness, readability, performance, security |
| `qa` | Generate + run tests for a file, report pass/fail |
| `security-auditor` | Audit API routes, auth flows, payment handling, data access |
| `refactor` | Clean up working code without changing behavior |
| `ui-component-writer` | Write or rewrite Next.js components from a design spec |
| `design-reviewer` | Review listing thumbnails, product pages, site UI |
| `research` | Market research, niche analysis, competitor analysis |
| `ads-social-advisor` | Pinterest strategy, Etsy ads, social content planning |
