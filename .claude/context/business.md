# PosterGenius — Business Context

## Brand

- **Name:** PosterGenius
- **Site:** https://postergenius.ca
- **Owner:** Kaleel (klawrenceboxx on GitHub)
- **Location:** Canada
- **Stage:** Active, in development (last code changes Dec 2025)

## What We Sell

| Product Type | Delivery | Infrastructure |
|---|---|---|
| Digital poster downloads | Instant, via S3 presigned URL | AWS S3 |
| Physical printed posters | 4–7 day shipping via Printful | Printful POD |

Sizes available: 12×18, 18×24, 24×36 inches.

## Business Model

- Print-on-demand — no inventory held
- Multi-vendor marketplace: sellers can upload products and manage their own storefronts
- Revenue from product sales (margins on digital + physical)
- Guest checkout supported (no account required)

## Revenue Strategy

Run all three channels together — they serve different jobs:

| Channel | Role | Priority Action |
|---|---|---|
| postergenius.ca | Margin + brand + email list | Drive Pinterest traffic here for email capture |
| Etsy (PosterGeniusCA) | Discovery + trust + built-in buyers | Keep listings fresh, SEO optimized |
| Pinterest | Free traffic engine to both above | Pin consistently from image repo |

**Why run both Etsy and own site:**
- Etsy buyers are already in purchase mode — don't leave that traffic on the table
- Own site saves ~6.5% Etsy transaction fee per sale + you own the customer relationship
- Pinterest drives traffic to both; link pins to Etsy for trust, own site for margin

**Current priority order:**
1. Pin consistently on Pinterest (use Cloudinary image library)
2. Keep Etsy listings SEO'd and thumbnail-optimized
3. Drive Pinterest → postergenius.ca for email capture + higher-margin sales
4. Add Etsy ads only once organic is working

## Integrations

- **Stripe** — payment processing (checkout + webhooks)
- **Printful** — physical POD fulfillment + shipping rates (Store ID: 16958262)
- **Cloudinary** — image hosting for product photos
- **AWS S3** — digital download storage (presigned URLs)
- **Clerk** — user authentication
- **Inngest** — async event queue (order processing, webhooks)
- **Nodemailer + Omnisend** — transactional + marketing email
- **Meta Pixel** — conversion tracking
