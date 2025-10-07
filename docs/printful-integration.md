# Printful Integration Guide

PosterGenius fulfills physical poster orders through Printful while continuing to deliver digital downloads instantly. This document captures the server-side architecture, data flow, and helper utilities that power the integration.

## Environment variables

Add the following variables to your deployment environment (for local work, place them in `.env.local`). Never expose these to the browser.

| Variable | Purpose |
| --- | --- |
| `PRINTFUL_API_KEY` | Required. Bearer token used for all Printful API calls. |
| `PRINTFUL_DEFAULT_COUNTRY` | Optional. Two-letter ISO country fallback when an address omits a country. Defaults to `US`. |

## Poster variant mapping

Poster sizes map to fixed Printful variant IDs to keep the checkout flow simple:

| Poster size | Variant ID |
| --- | --- |
| 12×18 | `68e1c9cb819f12` |
| 18×24 | `68e1c9cb819fb4` |
| 24×36 | `68e1c9cb81a046` |

The helper exported from `lib/printful.js` validates these mappings whenever physical items are processed, so adding a new size requires only updating that map.【F:lib/printful.js†L12-L76】

## API route overview

### `/api/printful/shipping`

Calculates live shipping rates directly against Printful during checkout. The route accepts the cart line items and an address (either by ID or inline payload), builds a Printful-compliant recipient object, and returns the available rates. The client requests only the cheapest rate by default, which is later reused when confirming the order.【F:app/api/printful/shipping/route.js†L1-L115】

### `/api/stripe/create-session`

The Stripe session builder determines whether the cart contains digital or physical items. For physical orders it:

1. Maps poster dimensions to Printful variant IDs.
2. Fetches the customer’s saved address, formats it for Printful, and requests shipping rates.
3. Adds the cheapest shipping rate as a dedicated line item in Stripe.
4. Stores order metadata (format, dimensions, shipping selection, and a snapshot of the recipient) for use during fulfillment.【F:app/api/stripe/create-session/route.js†L1-L196】

### `/api/stripe/webhook`

After Stripe reports a paid checkout session, the webhook handler creates a unified `Order` document that now tracks both digital and physical fulfillment state. Key responsibilities include:

- Building rich order line items (format, size, unit price, Printful variant ID) from metadata and product pricing rules.
- Generating expiring download links for digital purchases using `lib/s3` utilities.
- Persisting shipping details, Printful metadata, and distinguishing order type (`digital` or `physical`).
- Automatically creating and confirming the Printful order when physical items are present, storing the resulting Printful order ID, status, and tracking URL (if available).【F:app/api/stripe/webhook/route.js†L1-L223】

### `/api/printful/webhook`

Printful webhooks update local order status. Events are verified by checking the account store ID before the handler merges in the latest Printful status, tracking information, and failure reasons. Unsupported or unknown events safely log and exit without mutating data.【F:app/api/printful/webhook/route.js†L1-L89】

## Data model changes

The `Order` model now supports both fulfillment paths:

- `type` flags orders as `digital` or `physical`.
- Line items include `format`, `dimensions`, `unitPrice`, and the associated `printfulVariantId` when applicable.
- Physical orders capture Printful metadata such as `printfulOrderId`, `printfulStatus`, `shippingCost`, `shippingService`, and optional `trackingUrl`.
- Digital orders optionally store expiring download URLs generated at checkout.【F:models/Order.js†L1-L78】

## Helper utilities

All Printful-specific logic is centralized in `lib/printful.js`, which provides:

- `fetchFromPrintful` for authenticated HTTP requests with consistent error handling.
- Size/variant helpers (`normalizeDimensions`, `assertVariantId`) and recipient formatting utilities.
- Shipping utilities (`calculateShippingRates`, `pickCheapestRate`).
- Order utilities (`createPrintfulOrder`, `mapPrintfulStatus`, `extractTrackingFromPrintful`).
- Webhook helpers for parsing Printful payloads.【F:lib/printful.js†L1-L218】

Keeping these helpers server-only ensures API keys never reach the client while making it easy to share logic between routes.

## Alternative approaches

### Direct REST integration (current setup)

- **Pros:** Full control over payloads, logging, retries, and error handling. Easy to extend whenever Printful ships new endpoints.
- **Cons:** Requires ongoing maintenance of the REST contract and manual pagination or rate handling.

### Using an official or third-party SDK

- **Pros:** SDKs may provide typed models, retries, and ergonomic helpers.
- **Cons:** Adds a dependency that must stay in sync with Printful’s changes, increases bundle size, and can limit low-level customization (e.g., bespoke logging or analytics).

Because all Printful access flows through `lib/printful.js`, swapping to an SDK later would only require replacing those helper functions without touching your route handlers or UI code.
