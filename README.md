# PosterGenius

PosterGenius is a Next.js 15 e-commerce storefront built with the App Router. This README covers local development and the Printful fulfillment integration.

## Getting started

Run the development server:

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) to explore the storefront.

## Printful integration overview

PosterGenius communicates with Printful exclusively through server-only route handlers in the App Router. The integration includes:

- `/api/printful/shipping` – server-side shipping quotes against Printful for the active cart.
- `/api/stripe/create-session` – Stripe Checkout session builder that injects Printful shipping costs and flags order metadata.
- `/api/stripe/webhook` – persists orders, generates digital download links, and auto-creates Printful orders after successful payment.
- `/api/printful/webhook` – receives Printful status updates, syncing tracking numbers and fulfillment state locally.

All request logic is centralized in `lib/printful.js`, which authenticates using environment variables and exposes reusable helpers for other server modules.【F:lib/printful.js†L10-L213】

See [docs/printful-integration.md](docs/printful-integration.md) for detailed setup instructions, endpoint usage, and trade-offs between direct API calls and SDK-based approaches.【F:docs/printful-integration.md†L1-L82】

## Maintenance

If you upgraded from a version that enforced a unique `stripeSessionId` index, drop the old index once so the new partial index can be created:

```
db.orders.dropIndex("stripeSessionId_1")
```
