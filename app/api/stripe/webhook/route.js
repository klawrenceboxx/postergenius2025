import { NextResponse } from "next/server";
import Stripe from "stripe";
import connectDB from "@/config/db";
import Order from "@/models/Order";
import Address from "@/models/Address";
import Cart from "@/models/Cart";
import Product from "@/models/Product";
import { computePricing } from "@/lib/pricing";
import {
  createPrintfulOrder,
  formatRecipientFromAddress,
  mapPrintfulStatus,
  extractTrackingFromPrintful,
  assertVariantIdForProduct,
  normalizeDimensions,
} from "@/lib/printful";
import { ensureProductCdnUrl } from "@/lib/cdn";
import { appendOrderLog, buildLogEntry } from "@/lib/order-logs";
import { createGuestAccessToken } from "@/lib/orderAccess";
import { getDownloadUrl } from "@/lib/s3";
import {
  sendCustomOmnisendEvent,
  sendPlacedOrderEvent,
} from "@/lib/omnisend";
import { sendPurchaseAlertEmail } from "@/lib/sellerAlerts";
import { STORE_EVENT_TYPES, recordStoreEvents } from "@/lib/storeEvents";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

function safeJsonParse(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export async function POST(req) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 400 }
    );
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const metadata = session.metadata || {};

      const itemsMetadata = safeJsonParse(metadata.items, []);
      const shippingMeta = safeJsonParse(metadata.shipping, null);
      const recipientSnapshot = safeJsonParse(metadata.recipient, null);
      const shippingAddressSnapshot = safeJsonParse(
        metadata.shippingAddressSnapshot,
        null
      );
      const customerEmail =
        session.customer_details?.email ||
        session.customer_email ||
        metadata.customerEmail ||
        shippingAddressSnapshot?.email ||
        null;
      const guestId = metadata.guestId || null;

      await connectDB();

      // prevent duplicate orders for same Stripe session
      const existing = await Order.findOne({ stripeSessionId: session.id });
      if (existing) {
        return NextResponse.json({ received: true });
      }

      const addressRaw = (() => {
        try {
          return JSON.parse(metadata.address || "null");
        } catch {
          return metadata.address || null;
        }
      })();

      const addressId =
        typeof addressRaw === "string" ? addressRaw : addressRaw?._id || null;

      const addressDoc = addressId
        ? await Address.findById(addressId).lean()
        : null;

      const orderItems = [];
      const printfulItems = [];
      const digitalDownloads = [];
      let hasPhysical = false;
      let hasDigital = false;

      const validEntries = (Array.isArray(itemsMetadata) ? itemsMetadata : []).filter((entry) => {
        const productId = entry?.productId || entry?.product;
        const quantity = Math.max(1, Number(entry?.quantity) || 0);
        return productId && quantity > 0;
      });

      const productIds = validEntries.map((e) => e?.productId || e?.product);
      const productsArray = await Product.find({ _id: { $in: productIds } }).lean();
      const productMap = new Map(productsArray.map((p) => [p._id.toString(), p]));

      for (const entry of validEntries) {
        const productId = entry?.productId || entry?.product;
        const quantity = Math.max(1, Number(entry?.quantity) || 0);

        const product = productMap.get(productId?.toString?.());
        if (!product) {
          console.error("Product missing for order item", productId);
          continue;
        }

        const cdnUrl = ensureProductCdnUrl(product);
        if (!cdnUrl) {
          console.warn(
            "⚠️ Missing cdnUrl for product during Stripe webhook processing.",
            { productId: product._id }
          );
        }

        const pricing = computePricing(product);
        const files = cdnUrl
          ? [
              {
                type: "default",
                url: cdnUrl,
              },
            ]
          : undefined;
        const format = String(entry?.format || "physical").toLowerCase();
        let unitPrice =
          format === "digital"
            ? pricing.digitalFinalPrice
            : pricing.defaultPhysicalFinalPrice;
        let dimensions =
          entry?.dimensions || pricing.defaultPhysicalDimensions || null;
        let variantId = null;

        if (format === "digital") {
          hasDigital = true;
        } else {
          hasPhysical = true;
          const normalizedDimensions =
            normalizeDimensions(dimensions) ||
            normalizeDimensions(pricing.defaultPhysicalDimensions);
          const sizeForVariant =
            dimensions || pricing.defaultPhysicalDimensions;
          variantId = assertVariantIdForProduct(product, sizeForVariant);
          const priceRecord =
            pricing.physicalPricing?.[dimensions] ||
            pricing.physicalPricing?.[normalizedDimensions];
          unitPrice = Number(
            priceRecord?.finalPrice ?? pricing.defaultPhysicalFinalPrice
          );
          printfulItems.push({
            variant_id: variantId,
            quantity,
            retail_price: unitPrice.toFixed(2),
            name: product.name,
            files,
          });
        }

        unitPrice = Math.max(0, Number(unitPrice) || 0);
        const lineTotal = unitPrice * quantity;

        orderItems.push({
          product: product._id,
          quantity,
          format,
          dimensions: format !== "digital" ? dimensions : undefined,
          unitPrice,
          lineTotal,
          printfulVariantId: variantId || undefined,
        });

        if (format === "digital") {
          const expiresInSeconds = 60 * 60 * 24;
          const downloadName =
            product.digitalFileName || product.name || "Poster Download";
          if (product.digitalFileKey) {
            try {
              const url = await getDownloadUrl(product.digitalFileKey, {
                expiresIn: expiresInSeconds,
                downloadName,
              });
              digitalDownloads.push({
                product: product._id,
                url,
                expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
              });
            } catch (error) {
              console.error(
                "⚠️ Failed to generate download URL for",
                product._id,
                error.message
              );
            }
          } else if (product.digitalFileUrl) {
            digitalDownloads.push({
              product: product._id,
              url: product.digitalFileUrl,
              expiresAt: null,
            });
          }
        }
      }

      if (orderItems.length === 0) {
        throw new Error(
          "No purchasable items found in Stripe session metadata"
        );
      }

      const orderType =
        metadata.orderType || (hasPhysical ? "physical" : "digital");

      const subtotal = toNumber(session.amount_subtotal, 0) / 100;
      const amount = toNumber(session.amount_total, 0) / 100;
      const tax =
        session.total_details?.amount_tax != null
          ? toNumber(session.total_details.amount_tax) / 100
          : Math.max(0, amount - subtotal);

      const shippingCost =
        shippingMeta && shippingMeta.rate != null
          ? Number(shippingMeta.rate)
          : null;

      const initialStatus =
        orderType === "physical"
          ? "Awaiting Fulfillment"
          : digitalDownloads.length > 0
          ? "Digital Delivery Sent"
          : "Completed";

      const creationLog = buildLogEntry(
        "order_created",
        "Order created from Stripe checkout session."
      );

      const guestAccessToken = guestId ? createGuestAccessToken() : null;

      const baseOrder = {
        userId: metadata.userId || undefined,
        guestId: guestId || undefined,
        customerEmail: customerEmail || undefined,
        items: orderItems,
        cartSnapshot: validEntries,
        shippingAddressSnapshot:
          shippingAddressSnapshot || recipientSnapshot || undefined,
        subtotal,
        tax,
        amount,
        date: Date.now(),
        stripeSessionId: session.id,
        type: orderType,
        status: initialStatus,
        shippingCost:
          shippingCost != null && Number.isFinite(shippingCost)
            ? shippingCost
            : undefined,
        shippingCurrency: shippingMeta?.currency || undefined,
        shippingService: shippingMeta?.name || undefined,
        shippingRateId: shippingMeta?.id || undefined,
        digitalDownloads: digitalDownloads.length
          ? digitalDownloads
          : undefined,
        guestAccessToken: guestAccessToken || undefined,
        orderLogs: [creationLog],
      };

      if (addressId && metadata.userId) {
        baseOrder.address = addressId;
      }

      const newOrder = new Order(baseOrder);

      await newOrder.save();

      try {
        if (metadata.userId) {
          await Cart.findOneAndUpdate({ userId: metadata.userId }, { items: {} });
        } else if (guestId) {
          await Cart.findOneAndUpdate({ guestId }, { items: {} });
        }
      } catch (cartError) {
        console.error("[stripe-webhook] Failed to clear cart after purchase", cartError);
      }

      try {
        await recordStoreEvents(
          orderItems.map((item) => ({
            eventType: STORE_EVENT_TYPES.PURCHASE_COMPLETED,
            productId:
              typeof item.product === "object" && item.product !== null
                ? item.product.toString()
                : String(item.product),
            userId: metadata.userId || undefined,
            orderId: String(newOrder._id),
            stripeSessionId: session.id,
            format: item.format,
            dimensions: item.dimensions,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
            source: "stripe_webhook",
          }))
        );
      } catch (trackingError) {
        console.error(
          "[stripe-webhook] Failed to record purchase events",
          trackingError
        );
      }

      await appendOrderLog(
        newOrder._id,
        "stripe_payment_confirmed",
        "Stripe checkout session payment confirmed."
      );

      if (digitalDownloads.length) {
        await appendOrderLog(
          newOrder._id,
          "digital_delivery_prepared",
          `Prepared ${digitalDownloads.length} digital download link(s).`
        );
      }

      if (orderType === "physical" && printfulItems.length > 0) {
        let recipientForPrintful = null;

        if (addressDoc) {
          try {
            recipientForPrintful = formatRecipientFromAddress(addressDoc);
          } catch (error) {
            console.error(
              "❌ Failed to format saved address for Printful",
              error.message
            );
          }
        }

        if (!recipientForPrintful && recipientSnapshot) {
          try {
            recipientForPrintful =
              formatRecipientFromAddress(recipientSnapshot);
          } catch (error) {
            console.error(
              "❌ Failed to format snapshot address for Printful",
              error.message
            );
          }
        }

        if (!recipientForPrintful && shippingAddressSnapshot) {
          try {
            recipientForPrintful = formatRecipientFromAddress(shippingAddressSnapshot);
          } catch (error) {
            console.error(
              "❌ Failed to format shipping snapshot for Printful",
              error.message
            );
          }
        }

        if (!recipientForPrintful) {
          console.error("❌ Missing shipping recipient for Printful order", {
            orderId: newOrder._id,
          });
          await Order.findByIdAndUpdate(newOrder._id, {
            $set: {
              status: "Fulfillment Failed",
              fulfillmentError: "Missing shipping recipient for Printful order",
            },
          });
          await appendOrderLog(
            newOrder._id,
            "printful_order_failed",
            "Missing shipping recipient prevented Printful fulfillment."
          );
        } else {
          try {
            const payload = {
              external_id: session.id,
              recipient: recipientForPrintful,
              items: printfulItems,
            };

            if (shippingMeta?.id) {
              payload.shipping = shippingMeta.id;
            }

            const printfulOrder = await createPrintfulOrder(payload, {
              confirm: true,
            });

            const printfulId =
              printfulOrder?.id ||
              printfulOrder?.result?.id ||
              printfulOrder?.order?.id ||
              null;
            const printfulStatus =
              printfulOrder?.status ||
              printfulOrder?.result?.status ||
              printfulOrder?.order?.status ||
              null;
            const tracking = extractTrackingFromPrintful(printfulOrder);

            await Order.findByIdAndUpdate(newOrder._id, {
              $set: {
                printfulOrderId: printfulId || undefined,
                printfulStatus: printfulStatus || undefined,
                status: mapPrintfulStatus(printfulStatus),
                trackingUrl: tracking.trackingUrl || undefined,
                trackingNumber: tracking.trackingNumber || undefined,
                trackingCarrier: tracking.carrier || undefined,
              },
            });
            await appendOrderLog(
              newOrder._id,
              "printful_order_created",
              `Printful order ${
                printfulId || "(pending id)"
              } created with status ${printfulStatus || "unknown"}.`
            );
          } catch (error) {
            console.error("❌ Printful order creation failed:", error);
            await Order.findByIdAndUpdate(newOrder._id, {
              $set: {
                status: "Fulfillment Failed",
                fulfillmentError: error.message,
              },
            });
            await appendOrderLog(
              newOrder._id,
              "printful_order_failed",
              `Printful order creation failed: ${error.message}`
            );
          }
        }
      }

      const omnisendLineItems = validEntries.map((entry) => {
        const productId = entry?.productId || entry?.product;
        const product = productMap.get(productId?.toString?.());
        const matchingOrderItem = orderItems.find(
          (item) =>
            String(item?.product) === String(productId) &&
            String(item?.format || "physical") ===
              String(entry?.format || "physical").toLowerCase()
        );

        return {
          productID: product?._id?.toString?.() || String(productId || ""),
          productTitle: product?.name || "PosterGenius Poster",
          productPrice: Number(
            matchingOrderItem?.unitPrice || entry?.price || 0
          ),
          quantity: Math.max(1, Number(entry?.quantity) || 1),
          productImageURL: product?.image?.[0] || undefined,
          productURL: product?.slug
            ? `${process.env.NEXT_PUBLIC_BASE_URL || ""}/product/${product.slug}`
            : undefined,
          format: String(entry?.format || "physical").toLowerCase(),
          dimensions: entry?.dimensions || undefined,
        };
      });

      try {
        const omnisendResult = await sendPlacedOrderEvent({
          email: customerEmail,
          phone:
            shippingAddressSnapshot?.phone ||
            recipientSnapshot?.phone ||
            addressDoc?.phoneNumber ||
            undefined,
          orderId: newOrder._id,
          createdAt: newOrder.createdAt || new Date(),
          currency: shippingMeta?.currency || session.currency || "CAD",
          totalPrice: amount,
          fulfillmentStatus:
            orderType === "physical" ? "unfulfilled" : "fulfilled",
          paymentStatus: "paid",
          lineItems: omnisendLineItems,
          customProperties: {
            orderType,
            stripeSessionId: session.id,
            guestCheckout: Boolean(guestId),
            guestAccessToken: guestAccessToken || undefined,
            downloadCount: digitalDownloads.length,
          },
        });

        if (omnisendResult.sent) {
          await appendOrderLog(
            newOrder._id,
            "omnisend_order_event_sent",
            "Sent Omnisend placed order event."
          );
        }
      } catch (omnisendError) {
        console.error("[stripe-webhook] Failed to send Omnisend order event", omnisendError);
        await appendOrderLog(
          newOrder._id,
          "omnisend_order_event_failed",
          `Omnisend order event failed: ${omnisendError.message}`
        );
      }

      if (digitalDownloads.length > 0) {
        try {
          const digitalEvent = await sendCustomOmnisendEvent({
            email: customerEmail,
            phone:
              shippingAddressSnapshot?.phone ||
              recipientSnapshot?.phone ||
              addressDoc?.phoneNumber ||
              undefined,
            eventName: "postergenius_digital_download_ready",
            properties: {
              orderId: String(newOrder._id),
              stripeSessionId: session.id,
              downloadCount: digitalDownloads.length,
              guestCheckout: Boolean(guestId),
            },
          });

          if (digitalEvent.sent) {
            await appendOrderLog(
              newOrder._id,
              "omnisend_digital_ready_sent",
              "Sent Omnisend digital download ready event."
            );
          }
        } catch (digitalEventError) {
          console.error(
            "[stripe-webhook] Failed to send Omnisend digital event",
            digitalEventError
          );
          await appendOrderLog(
            newOrder._id,
            "omnisend_digital_ready_failed",
            `Omnisend digital event failed: ${digitalEventError.message}`
          );
        }
      }

      try {
        await sendPurchaseAlertEmail({
          order: newOrder,
          customerLabel: metadata.userId || session.customer_email || "Guest",
          purchasedItems: validEntries.map((entry) => {
            const productId = entry?.productId || entry?.product;
            const product = productMap.get(productId?.toString?.());

            return {
              name: product?.name || "Unknown product",
              quantity: Math.max(1, Number(entry?.quantity) || 1),
              format: String(entry?.format || "physical").toLowerCase(),
              dimensions: entry?.dimensions || null,
            };
          }),
        });
      } catch (alertError) {
        console.error("[stripe-webhook] Failed to send purchase alert", alertError);
      }
    }
  } catch (err) {
    console.error("Stripe webhook processing error:", err?.message || err);
    return NextResponse.json(
      { success: false, message: "Webhook processing error" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
