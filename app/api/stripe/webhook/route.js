import { NextResponse } from "next/server";
import Stripe from "stripe";
import connectDB from "@/config/db";
import Order from "@/models/Order";
import Product from "@/models/Product";
import { computePricing } from "@/lib/pricing";
import { normalizeDimensions } from "@/lib/printful";
import { appendOrderLog, buildLogEntry } from "@/lib/order-logs";
import { getDownloadUrl } from "@/lib/s3";
import { submitStaticPrintfulOrder } from "@/lib/printful-static-order";

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
  console.log("=== [STRIPE WEBHOOK] START ===");
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    console.log("📩 Stripe Event:", event.type);
  } catch (err) {
    console.error("❌ Webhook signature verification failed:", err.message);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 400 }
    );
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const metadata = session.metadata || {};
      console.log("✅ checkout.session.completed, metadata:", metadata);

      const itemsMetadata = safeJsonParse(metadata.items, []);
      const shippingMeta = safeJsonParse(metadata.shipping, null);
      await connectDB();
      console.log("✅ DB connected in webhook");

      // prevent duplicate orders for same Stripe session
      const existing = await Order.findOne({ stripeSessionId: session.id });
      if (existing) {
        console.log(
          "ℹ️ Order already exists for session:",
          session.id,
          "orderId:",
          existing._id
        );
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
        typeof addressRaw === "string"
          ? addressRaw
          : addressRaw?._id || null;

      const orderItems = [];
      const digitalDownloads = [];
      let hasPhysical = false;
      let hasDigital = false;

      for (const entry of Array.isArray(itemsMetadata) ? itemsMetadata : []) {
        const productId = entry?.productId || entry?.product;
        const quantity = Math.max(1, Number(entry?.quantity) || 0);
        if (!productId || quantity <= 0) {
          continue;
        }

        const product = await Product.findById(productId).lean();
        if (!product) {
          console.warn("⚠️ Product missing for order item", productId);
          continue;
        }

        const pricing = computePricing(product);
        const format = String(entry?.format || "physical").toLowerCase();
        let unitPrice =
          format === "digital"
            ? pricing.digitalFinalPrice
            : pricing.defaultPhysicalFinalPrice;
        let dimensions =
          entry?.dimensions || pricing.defaultPhysicalDimensions || null;

        if (format === "digital") {
          hasDigital = true;
        } else {
          hasPhysical = true;
          const normalizedDimensions =
            normalizeDimensions(dimensions) ||
            normalizeDimensions(pricing.defaultPhysicalDimensions);
          const priceRecord =
            pricing.physicalPricing?.[dimensions] ||
            pricing.physicalPricing?.[normalizedDimensions];
          unitPrice = Number(
            priceRecord?.finalPrice ?? pricing.defaultPhysicalFinalPrice
          );
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
        throw new Error("No purchasable items found in Stripe session metadata");
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

      const baseOrder = {
        userId: metadata.userId,
        items: orderItems,
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
        digitalDownloads: digitalDownloads.length ? digitalDownloads : undefined,
        orderLogs: [creationLog],
      };

      if (addressId) {
        baseOrder.address = addressId;
      }

      const newOrder = new Order(baseOrder);

      await newOrder.save();
      console.log("📝 Order saved:", newOrder._id);

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

      if (orderType === "physical") {
        try {
          const response = await submitStaticPrintfulOrder();
          const printfulId = response?.result?.id || response?.id || null;
          await appendOrderLog(
            newOrder._id,
            "printful_order_triggered",
            printfulId
              ? `Static Printful order submitted with id ${printfulId}.`
              : "Static Printful order submitted after Stripe payment."
          );
          console.log("✅ Static Printful order submitted", {
            orderId: newOrder._id,
            printfulId,
          });
        } catch (error) {
          console.error("❌ Static Printful order submission failed:", error);
          await appendOrderLog(
            newOrder._id,
            "printful_order_failed",
            `Static Printful order failed: ${error.message}`
          );
        }
      }
    }
  } catch (err) {
    console.error("❌ ERROR processing webhook:", err?.message || err);
    return NextResponse.json(
      { success: false, message: "Webhook processing error" },
      { status: 500 }
    );
  }

  console.log("=== [STRIPE WEBHOOK] END ===");
  return NextResponse.json({ received: true });
}
