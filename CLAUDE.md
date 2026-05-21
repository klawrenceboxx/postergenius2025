# PosterGenius — Claude Code Assistant

## What This Is

PosterGenius (postergenius.ca) is a Canadian print-on-demand e-commerce platform.
- **Digital poster downloads** — instant delivery via AWS S3 presigned URLs (sizes: 12×18, 18×24, 24×36)
- **Physical posters** — printed and shipped via Printful (POD)
- Multi-vendor marketplace with seller dashboard. Guest checkout supported.

## On-Demand Context

Load these only when doing marketing/business work:
```
# @.claude/context/business.md   — revenue strategy, channels, integrations
# @.claude/context/etsy.md       — Etsy SEO, fees, listing strategy
# @.claude/context/pinterest.md  — Pinterest pinning strategy
# @.claude/context/cloudinary.md — image assets, Cloudinary/S3 workflow
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router, Turbopack) |
| Frontend | React 19, Tailwind CSS 3.4, Lucide icons |
| Database | MongoDB (Mongoose 8) |
| Auth | Clerk (`middleware.ts`) |
| Payments | Stripe (checkout + webhooks) |
| Fulfillment | Printful API (POD + shipping) |
| Media | Cloudinary (images) + AWS S3 (digital downloads) |
| Events | Inngest (async event queue) |
| Email | Nodemailer (SMTP) + Omnisend |
| Search | Fuse.js (client-side fuzzy) |
| State | React Context |

## Key Files

```
app/api/          # All API routes
  stripe/         # Checkout + webhook
  printful/       # Orders, variants, shipping, webhooks
  order/          # Order management
  product/        # Product CRUD
  user/           # User profiles + addresses
  cart/           # Shopping cart
  checkout/       # Checkout flow
  download-link/  # S3 presigned download URLs
  reviews/        # Product reviews
  wishlist/       # Wishlists

lib/printful.js          # Printful API wrapper
lib/s3.js                # AWS S3 utilities
lib/pricing.js           # Pricing logic
lib/promoCode.js         # Promo code validation

models/           # MongoDB schemas (10 models)
  Product.js, Order.js, User.js, Cart.js, Review.js,
  Wishlist.js, Address.js, GuestAddress.js, PromoModel.js, WebhookFailure.js

config/db.js                  # MongoDB connection
config/printfulVariants.js    # Printful size variant ID mapping
config/inngest.js             # Inngest setup
context/AppContext.jsx        # Global app state
middleware.ts                 # Clerk auth middleware
```

## Printful Variant IDs

| Size | Variant ID |
|------|-----------|
| 12×18 | `68e1c9cb819f12` |
| 18×24 | `68e1c9cb819fb4` |
| 24×36 | `68e1c9cb81a046` |

## Commands

```bash
npm run dev    # Dev server (Turbopack) — http://localhost:3000
npm run build  # Production build
npm start      # Start production server
npm run lint   # ESLint
```

## Environment Variables

All set in Vercel (project: `postergenius2025`, ID: `prj_J4UYaakI1yl7KBHROEqSlnIPpyGT`).

| Var | Notes |
|-----|-------|
| `MONGODB_URI` | Atlas cluster0 |
| `STRIPE_SECRET_KEY` | Live mode (`sk_live_...`) |
| `STRIPE_WEBHOOK_SECRET` | ⚠️ Register live webhook at postergenius.ca/api/stripe/webhook → paste new `whsec_...` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Live mode (`pk_live_...`) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Live mode (`pk_live_...`) |
| `CLERK_SECRET_KEY` | Live mode (`sk_live_...`) |
| `PRINTFUL_API_KEY` / `PRINTFUL_STORE_ID` | Store ID: 16958262 |
| `PRINTFUL_DEFAULT_COUNTRY` | CA |
| `AWS_ACCESS_KEY_ID/SECRET/REGION` | us-east-2 |
| `S3_BUCKET_NAME` | `postergenius-poster-downloads` (NOT `AWS_S3_BUCKET`) |
| `NEXT_PUBLIC_URL` | https://postergenius.ca |

## Git

- **Remote:** https://github.com/klawrenceboxx/postergenius2025.git
- **Branch:** main

## Agents

Specialized agents in `.claude/agents/`: `code-reviewer`, `qa`, `security-auditor`, `refactor`, `ui-component-writer`, `design-reviewer`, `research`, `ads-social-advisor`
