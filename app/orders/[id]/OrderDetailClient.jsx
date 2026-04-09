"use client";

import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getOptimizedImageProps } from "@/lib/imageUtils";

function resolveShippingAddress(order) {
  return order?.address || order?.shippingAddressSnapshot || null;
}

function resolveProductId(item) {
  const product = item?.product;
  return typeof product === "string" ? product : product?._id?.toString?.() || null;
}

export default function OrderDetailClient({ order, accessToken }) {
  const [downloading, setDownloading] = useState(null);
  const shippingAddress = resolveShippingAddress(order);

  const downloadItem = async (item) => {
    const productId = resolveProductId(item);
    if (!productId) {
      toast.error("Download unavailable for this item.");
      return;
    }

    try {
      setDownloading(productId);
      const params = new URLSearchParams({ productId });

      if (accessToken) {
        params.set("orderId", order._id);
        params.set("token", accessToken);
      }

      const { data } = await axios.get(`/api/download-link?${params.toString()}`);
      if (data?.success && data?.url) {
        window.location.href = data.url;
        return;
      }

      toast.error(data?.message || "Download unavailable.");
    } catch (error) {
      toast.error(
        error?.response?.data?.message || error.message || "Download unavailable."
      );
    } finally {
      setDownloading(null);
    }
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-stone-50 px-6 py-10 md:px-16 lg:px-24">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-[28px] border border-stone-200 bg-white p-6 shadow-sm md:p-8">
            <div className="flex flex-col gap-3 border-b border-stone-200 pb-5 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.18em] text-stone-500">
                  Order Details
                </p>
                <h1 className="mt-2 text-3xl font-semibold text-blackhex">
                  Order #{order.orderNumber || String(order._id).slice(-8).toUpperCase()}
                </h1>
                <p className="mt-2 text-sm text-stone-500">
                  {new Date(order.date || order.createdAt).toLocaleString()}
                </p>
              </div>

              <div className="text-sm text-stone-700 md:text-right">
                <p className="font-medium text-blackhex">
                  {order.status || "Order Placed"}
                </p>
                <p className="mt-1">
                  Total: ${Number(order.amount || order.totalPrice || 0).toFixed(2)}
                </p>
                {order.trackingUrl ? (
                  <a
                    href={order.trackingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-primary hover:underline"
                  >
                    Track shipment
                  </a>
                ) : null}
              </div>
            </div>

            <div className="mt-5 rounded-2xl bg-stone-100 p-4 text-sm text-stone-700">
              <p className="font-medium text-blackhex">Order number</p>
              <p className="mt-1 text-base font-semibold tracking-[0.18em] text-blackhex">
                {order.orderNumber || String(order._id).slice(-8).toUpperCase()}
              </p>
              <p className="mt-2 text-xs text-stone-500">
                Use this number for guest lookup, support, and order updates.
              </p>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-[2fr,1fr]">
              <section className="space-y-4">
                {(order.items || []).map((item, index) => {
                  const product = item?.product || {};
                  const productImage = product?.image?.[0];
                  const productId = resolveProductId(item);
                  const canDownload = item?.format === "digital";

                  return (
                    <article
                      key={`${order._id}-${index}`}
                      className="flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-4"
                    >
                      {productImage ? (
                        <Image
                          {...getOptimizedImageProps(productImage, {
                            variant: "thumbnail",
                          })}
                          alt={product?.name || "Poster"}
                          className="h-16 w-16 rounded-lg object-cover"
                          width={64}
                          height={64}
                        />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-stone-300 text-[10px] text-stone-500">
                          No image
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-blackhex">
                          {product?.name || "PosterGenius Poster"}
                        </p>
                        <p className="mt-1 text-sm text-stone-500">
                          {item?.format || "physical"}
                          {item?.dimensions && item.dimensions !== "digital"
                            ? ` • ${item.dimensions}`
                            : ""}
                          {` • Qty ${item?.quantity || 1}`}
                        </p>
                      </div>

                      {canDownload ? (
                        <button
                          type="button"
                          onClick={() => downloadItem(item)}
                          disabled={!productId || downloading === productId}
                          className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                        >
                          {downloading === productId ? "Preparing..." : "Download"}
                        </button>
                      ) : null}
                    </article>
                  );
                })}
              </section>

              <aside className="space-y-5 rounded-2xl bg-stone-100 p-5 text-sm text-stone-700">
                {shippingAddress ? (
                  <div>
                    <p className="font-medium text-blackhex">Delivery</p>
                    <p className="mt-1">{shippingAddress.fullName || "Customer"}</p>
                    {shippingAddress.street || shippingAddress.area ? (
                      <p>{shippingAddress.street || shippingAddress.area}</p>
                    ) : null}
                    <p>
                      {[shippingAddress.city, shippingAddress.province || shippingAddress.state]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                    {shippingAddress.postalCode || shippingAddress.pincode ? (
                      <p>{shippingAddress.postalCode || shippingAddress.pincode}</p>
                    ) : null}
                  </div>
                ) : null}

                {order.trackingNumber ? (
                  <div>
                    <p className="font-medium text-blackhex">Tracking</p>
                    <p className="mt-1">{order.trackingNumber}</p>
                    {order.trackingCarrier ? <p>{order.trackingCarrier}</p> : null}
                  </div>
                ) : null}

                {order.orderLogs?.length ? (
                  <div>
                    <p className="font-medium text-blackhex">Latest update</p>
                    <p className="mt-1">
                      {order.orderLogs[order.orderLogs.length - 1]?.message}
                    </p>
                  </div>
                ) : null}
              </aside>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
