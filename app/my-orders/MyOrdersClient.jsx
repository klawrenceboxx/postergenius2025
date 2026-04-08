"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import toast from "react-hot-toast";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Loading from "@/components/Loading";
import { useAppContext } from "@/context/AppContext";
import { getOptimizedImageProps } from "@/lib/imageUtils";
import { GUEST_ORDER_ACCESS_STORAGE_KEY } from "@/lib/orderAccess";

function readStoredGuestTokens() {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(GUEST_ORDER_ACCESS_STORAGE_KEY) || "[]"
    );
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function storeGuestToken(token) {
  if (typeof window === "undefined" || !token) return;

  const tokens = [...new Set([token, ...readStoredGuestTokens()])];
  window.localStorage.setItem(
    GUEST_ORDER_ACCESS_STORAGE_KEY,
    JSON.stringify(tokens.slice(0, 25))
  );
}

function resolveShippingAddress(order) {
  return order?.address || order?.shippingAddressSnapshot || null;
}

function resolveProductId(item) {
  const product = item?.product;
  return typeof product === "string" ? product : product?._id?.toString?.() || null;
}

export default function MyOrdersClient() {
  const { getToken, user, setCartItems, fetchCart, currency } = useAppContext();
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [downloading, setDownloading] = useState(null);

  const sessionId = searchParams.get("session_id");
  const accessTokenFromUrl =
    searchParams.get("access") || searchParams.get("guestAccessToken");

  useEffect(() => {
    if (accessTokenFromUrl) {
      storeGuestToken(accessTokenFromUrl);
    }
  }, [accessTokenFromUrl]);

  useEffect(() => {
    let ignore = false;

    const confirmPurchase = async () => {
      if (!sessionId) return;

      try {
        setConfirming(true);
        const { data } = await axios.post("/api/stripe/confirm", { sessionId });

        if (ignore) return;

        if (data?.success) {
          if (data.guestAccessToken) {
            storeGuestToken(data.guestAccessToken);
          }

          setCartItems({});
          await fetchCart({ createGuestIfMissing: false });
          toast.success("Order confirmed");
        } else {
          toast.error(data?.message || "Unable to confirm order");
        }
      } catch (error) {
        if (!ignore) {
          toast.error(
            error?.response?.data?.message ||
              error.message ||
              "Unable to confirm order"
          );
        }
      } finally {
        if (!ignore) {
          setConfirming(false);
        }
      }
    };

    confirmPurchase();

    return () => {
      ignore = true;
    };
  }, [fetchCart, sessionId, setCartItems]);

  useEffect(() => {
    let ignore = false;

    const loadOrders = async () => {
      try {
        setLoading(true);

        if (user) {
          const token = await getToken();
          const { data } = await axios.get("/api/order/list", {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (!ignore) {
            if (data?.success) {
              setOrders(data.orders || []);
            } else {
              toast.error(data?.message || "Unable to load orders");
            }
          }
          return;
        }

        const tokens = readStoredGuestTokens();
        if (tokens.length === 0) {
          if (!ignore) setOrders([]);
          return;
        }

        const { data } = await axios.post("/api/order/lookup", { tokens });
        if (!ignore) {
          if (data?.success) {
            setOrders(data.orders || []);
          } else {
            toast.error(data?.message || "Unable to load guest orders");
          }
        }
      } catch (error) {
        if (!ignore) {
          toast.error(
            error?.response?.data?.message || error.message || "Unable to load orders"
          );
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    if (!confirming) {
      loadOrders();
    }

    return () => {
      ignore = true;
    };
  }, [confirming, getToken, user]);

  const emptyState = useMemo(() => {
    if (user) {
      return "You have no orders yet.";
    }
    return "No guest orders were found on this browser yet.";
  }, [user]);

  const downloadItem = async (item, order) => {
    const productId = resolveProductId(item);
    if (!productId) {
      toast.error("Download unavailable for this item");
      return;
    }

    try {
      setDownloading(productId);
      const params = new URLSearchParams({ productId });
      if (!user && order?.guestAccessToken) {
        params.set("accessToken", order.guestAccessToken);
      }

      const { data } = await axios.get(`/api/download-link?${params.toString()}`);
      if (data?.success && data?.url) {
        window.location.href = data.url;
      } else {
        toast.error(data?.message || "Download unavailable");
      }
    } catch (error) {
      toast.error(
        error?.response?.data?.message || error.message || "Download unavailable"
      );
    } finally {
      setDownloading(null);
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen px-6 py-10 md:px-16 lg:px-24">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-3xl font-semibold text-blackhex">
            Your <span className="text-primary">Orders</span>
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Downloads, fulfillment status, and tracking all live here.
          </p>

          {confirming || loading ? (
            <div className="py-12">
              <Loading />
            </div>
          ) : orders.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-sm text-gray-600">
              {emptyState}
            </div>
          ) : (
            <div className="mt-8 space-y-5">
              {orders.map((order) => {
                const shippingAddress = resolveShippingAddress(order);
                return (
                  <article
                    key={order._id}
                    className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-2 border-b border-gray-200 pb-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-sm text-gray-500">
                          Order #{String(order._id).slice(-8).toUpperCase()}
                        </p>
                        <p className="mt-1 text-lg font-semibold text-blackhex">
                          {order.status || "Order Placed"}
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          {new Date(order.date || order.createdAt).toLocaleString()}
                        </p>
                      </div>

                      <div className="text-sm text-gray-700 md:text-right">
                        <p>
                          Total: {currency}
                          {Number(order.amount || order.totalPrice || 0).toFixed(2)}
                        </p>
                        <p className="mt-1">
                          Type: {order.type === "digital" ? "Digital" : "Physical"}
                        </p>
                        {order.trackingUrl && (
                          <a
                            href={order.trackingUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-block text-primary hover:underline"
                          >
                            Track shipment
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-5 md:grid-cols-[2fr,1fr]">
                      <div className="space-y-4">
                        {(order.items || []).map((item, index) => {
                          const product = item?.product || {};
                          const productImage = product?.image?.[0];
                          const productId = resolveProductId(item);
                          const canDownload = item?.format === "digital";

                          return (
                            <div
                              key={`${order._id}-${index}`}
                              className="flex items-center gap-4 rounded-xl border border-gray-100 p-3"
                            >
                              {productImage ? (
                                <Image
                                  {...getOptimizedImageProps(productImage, {
                                    variant: "thumbnail",
                                  })}
                                  alt={product?.name || "Poster"}
                                  className="h-16 w-16 rounded-md object-cover"
                                  width={64}
                                  height={64}
                                />
                              ) : (
                                <div className="flex h-16 w-16 items-center justify-center rounded-md border border-dashed border-gray-300 text-[10px] text-gray-500">
                                  No image
                                </div>
                              )}

                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium text-blackhex">
                                  {product?.name || "PosterGenius Poster"}
                                </p>
                                <p className="mt-1 text-sm text-gray-500">
                                  {item?.format || "physical"}
                                  {item?.dimensions && item.dimensions !== "digital"
                                    ? ` • ${item.dimensions}`
                                    : ""}
                                  {` • Qty ${item?.quantity || 1}`}
                                </p>
                              </div>

                              {canDownload && (
                                <button
                                  type="button"
                                  onClick={() => downloadItem(item, order)}
                                  disabled={!productId || downloading === productId}
                                  className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                                >
                                  {downloading === productId ? "Preparing..." : "Download"}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="space-y-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
                        {shippingAddress && (
                          <div>
                            <p className="font-medium text-blackhex">Delivery</p>
                            <p className="mt-1">
                              {shippingAddress.fullName || "Customer"}
                            </p>
                            {shippingAddress.street || shippingAddress.area ? (
                              <p>{shippingAddress.street || shippingAddress.area}</p>
                            ) : null}
                            <p>
                              {[shippingAddress.city, shippingAddress.province || shippingAddress.state]
                                .filter(Boolean)
                                .join(", ")}
                            </p>
                            {shippingAddress.postalCode || shippingAddress.pincode ? (
                              <p>
                                {shippingAddress.postalCode || shippingAddress.pincode}
                              </p>
                            ) : null}
                          </div>
                        )}

                        {order.trackingNumber && (
                          <div>
                            <p className="font-medium text-blackhex">Tracking</p>
                            <p className="mt-1">{order.trackingNumber}</p>
                            {order.trackingCarrier ? (
                              <p>{order.trackingCarrier}</p>
                            ) : null}
                          </div>
                        )}

                        {order.orderLogs?.length ? (
                          <div>
                            <p className="font-medium text-blackhex">Latest update</p>
                            <p className="mt-1">
                              {order.orderLogs[order.orderLogs.length - 1]?.message}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
