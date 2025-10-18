"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { assets } from "@/assets/assets";
import Image from "next/image";
import { useAppContext } from "@/context/AppContext";
import Footer from "@/components/seller/Footer";
import Loading from "@/components/Loading";
import axios from "axios";
import toast from "react-hot-toast";

export const metadata = {
  title: "Seller Orders | PosterGenius",
  description:
    "Monitor PosterGenius order fulfillment, shipping updates, and Printful status from the seller orders dashboard.",
  alternates: { canonical: "https://postergenius.ca/seller/orders" },
  openGraph: {
    title: "Seller Orders | PosterGenius",
    description:
      "Monitor PosterGenius order fulfillment, shipping updates, and Printful status from the seller orders dashboard.",
    url: "https://postergenius.ca/seller/orders",
    siteName: "PosterGenius",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Seller Orders | PosterGenius",
    description:
      "Monitor PosterGenius order fulfillment, shipping updates, and Printful status from the seller orders dashboard.",
  },
};

const POLL_INTERVAL = 15000;

const STATUS_COLORS = {
  "Awaiting Fulfillment": "bg-gray-200 text-gray-800",
  "In Production": "bg-orange-200 text-orange-800",
  Shipped: "bg-blue-200 text-blue-800",
  Delivered: "bg-green-200 text-green-800",
  "Fulfillment Failed": "bg-red-200 text-red-800",
};

const StatusBadge = ({ label }) => {
  const colorClass = STATUS_COLORS[label] || "bg-slate-200 text-slate-800";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${colorClass}`}
    >
      {label}
    </span>
  );
};

const Timeline = ({ events }) => {
  if (!events?.length) {
    return (
      <p className="text-xs text-gray-500">No order events recorded yet.</p>
    );
  }

  const sorted = [...events].sort(
    (a, b) =>
      new Date(b.timestamp || b.createdAt || 0) -
      new Date(a.timestamp || a.createdAt || 0)
  );

  return (
    <ul className="mt-2 space-y-1">
      {sorted.slice(0, 6).map((event, index) => (
        <li key={`${event.timestamp || event.createdAt}-${index}`} className="text-xs text-gray-700">
          <span className="font-medium">
            {new Date(event.timestamp || event.createdAt || Date.now()).toLocaleString()}
          </span>
          {": "}
          <span>{event.message}</span>
        </li>
      ))}
    </ul>
  );
};

const Orders = () => {
  const { currency, getToken, user } = useAppContext();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSellerOrders = useCallback(async () => {
    try {
      const token = await getToken();

      const { data } = await axios.get("/api/order/seller-orders", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
        setOrders(data.orders || []);
      } else {
        toast.error(data.message || "Failed to fetch orders");
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (!user) return;

    let isActive = true;

    const load = async () => {
      if (!isActive) return;
      await fetchSellerOrders();
    };

    load();
    const interval = setInterval(load, POLL_INTERVAL);

    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, [user, fetchSellerOrders]);

  const renderedOrders = useMemo(
    () =>
      orders.map((order) => {
        const isPhysical = order.type === "physical";
        const amountDisplay = `${currency}${Number(order.amount || 0).toFixed(2)}`;
        const address = order.address || {};
        const productsSummary = order.items
          .map((item) => {
            const productName =
              item?.product?.name || item?.productName || "Unknown Product";
            return `${productName} × ${item.quantity}`;
          })
          .join(", ");

        return (
          <div
            key={order._id}
            className="border border-gray-200 rounded-lg p-5 space-y-4 bg-white shadow-sm"
          >
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div className="flex gap-4">
                <Image
                  className="h-14 w-14 object-contain"
                  src={assets.box_icon}
                  alt="Order icon"
                />
                <div className="space-y-1 text-sm">
                  <p className="font-semibold text-gray-900">{productsSummary}</p>
                  <p className="text-gray-600">Items: {order.items.length}</p>
                  <p className="text-gray-500">
                    Placed on {new Date(order.date).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-start gap-2 text-sm md:items-end">
                <StatusBadge label={order.status} />
                <p className="font-semibold text-gray-900">{amountDisplay}</p>
                <p className="text-gray-500 capitalize">{order.type} order</p>
              </div>
            </div>

            {isPhysical && (
              <div className="grid gap-3 md:grid-cols-3 text-sm text-gray-700">
                <div>
                  <p className="font-medium text-gray-900">Shipping</p>
                  <p>{address?.fullName || "Recipient TBD"}</p>
                  <p>
                    {[address?.area, address?.city, address?.state]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                  <p>{address?.phoneNumber || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-gray-900">Printful</p>
                  <p>
                    Raw status:{" "}
                    <span className="font-semibold">
                      {order.printfulStatus || "Pending"}
                    </span>
                  </p>
                  <p>
                    Tracking:{" "}
                    {order.trackingUrl ? (
                      <a
                        href={order.trackingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        View shipment
                      </a>
                    ) : (
                      <span>Not yet available</span>
                    )}
                  </p>
                  {order.fulfillmentError && (
                    <p className="text-red-600">
                      Error: {order.fulfillmentError}
                    </p>
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900">Shipping Cost</p>
                  <p>
                    {order.shippingCost != null
                      ? `${currency}${Number(order.shippingCost).toFixed(2)}`
                      : "Included"}
                  </p>
                  <p className="text-gray-500">
                    {order.shippingService || "Service TBD"}
                  </p>
                </div>
              </div>
            )}

            <div>
              <p className="font-medium text-gray-900 text-sm">Order timeline</p>
              <Timeline events={order.orderLogs} />
            </div>
          </div>
        );
      }),
    [orders, currency]
  );

  return (
    <div className="flex-1 h-screen overflow-scroll flex flex-col justify-between text-sm bg-gray-50">
      {loading ? (
        <Loading />
      ) : (
        <div className="md:p-10 p-4 space-y-5">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-gray-900">
              Seller Orders | PosterGenius
            </h1>
            <p className="text-xs text-gray-500">
              Auto-refreshing every {POLL_INTERVAL / 1000} seconds
            </p>
          </div>
          <div className="space-y-4">{renderedOrders}</div>
        </div>
      )}
      <Footer />
    </div>
  );
};

export default Orders;
