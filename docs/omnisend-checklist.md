# Omnisend Checklist

This project uses Omnisend in two ways:

1. Newsletter/contact capture from `POST /api/omnisend/subscribe`
2. Custom lifecycle events sent from the Printful webhook processor

It does **not** currently use Omnisend as the primary transactional email sender for checkout confirmations. Those would need an Omnisend flow triggered by a matching event, or separate email delivery code.

## Credentials

Required environment variable:

- `OMNISEND_API_KEY`

Local development already has this in `.env`.
You should also make sure it exists in the Vercel environments you care about:

- `Preview`
- `Production`

## What The Code Sends

### 1. Newsletter subscribe route

File:

- `app/api/omnisend/subscribe/route.js`

What it sends:

- creates/updates a contact at `https://api.omnisend.com/v5/contacts`
- sets:
  - `email`
  - `status: subscribed`
  - `tags: [source]`
  - `sendWelcomeEmail: true`

Default source tag:

- `website-popup`

Implication:

- Omnisend can collect contacts immediately
- the built-in welcome behavior is requested
- long-term campaign behavior still depends on Omnisend-side automations/segments

### 2. Printful status events

File:

- `lib/printful-webhook-processor.js`

When Printful sends fulfillment updates, the app may send these Omnisend custom events:

- `postergenius_order_shipped`
- `postergenius_order_delivered`
- `postergenius_order_fulfillment_failed`
- `postergenius_order_canceled`

Event properties include:

- `orderId`
- `orderNumber`
- `stripeSessionId`
- `printfulOrderId`
- `status`
- `trackingUrl`
- `trackingNumber`
- `trackingCarrier`

Condition:

- these are only sent if `order.customerEmail` exists

## What Is Not Currently Wired

There is a helper in:

- `lib/omnisend.js`

for a placed-order event:

- `sendPlacedOrderEvent(...)`

But it is not currently called anywhere in the live order flow.

That means:

- Omnisend is currently wired for contact capture
- Omnisend is currently wired for shipping/status lifecycle events
- Omnisend is **not yet wired** in code for a dedicated "order placed" event or checkout confirmation flow

## Recommended Omnisend Dashboard Setup

Create or verify these automations in Omnisend:

1. Welcome / discount flow
   Trigger:
   - contact subscribes
   Recommended filters:
   - tag contains `website-popup`
   Purpose:
   - send the newsletter welcome / discount message

2. Order shipped flow
   Trigger:
   - custom event `postergenius_order_shipped`
   Content:
   - order number
   - tracking URL
   - tracking number

3. Order delivered flow
   Trigger:
   - custom event `postergenius_order_delivered`
   Content:
   - order number
   - delivery confirmation
   - review request if desired

4. Fulfillment failed flow
   Trigger:
   - custom event `postergenius_order_fulfillment_failed`
   Content:
   - order number
   - support/contact instructions

5. Order canceled flow
   Trigger:
   - custom event `postergenius_order_canceled`
   Content:
   - order number
   - explanation / support path

## Recommended Next Step

If you want Omnisend to handle checkout confirmation emails too, wire `sendPlacedOrderEvent(...)` into the order-complete path after a successful Stripe confirmation / order creation, then create an Omnisend automation triggered by:

- event name: `placed order`

## Quick Smoke Checklist

In Omnisend, verify:

- API key is active
- your sending domain is verified
- your brand sender email is configured
- the welcome flow is active
- all 4 Printful custom-event flows are active
- each flow is published, not draft
- each email template uses the event properties your app actually sends

## Test Mapping

Local automated coverage now exists for:

- checkout session creation for signed-in and guest digital/physical purchases
- Omnisend subscribe route behavior
- Printful helpers and webhook acceptance/rejection
- Stripe confirm route guest access token generation

What automated tests do **not** prove:

- that Omnisend dashboard automations are published
- that Omnisend templates are configured correctly
- that the Omnisend account/domain is approved for sending
