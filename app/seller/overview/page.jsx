"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Footer from "@/components/seller/Footer";
import Loading from "@/components/Loading";
import { useAppContext } from "@/context/AppContext";

const RANGE_OPTIONS = [
  { label: "Today", value: "24h" },
  { label: "7 Days", value: "7d" },
  { label: "30 Days", value: "30d" },
  { label: "All Time", value: "all" },
];

const OVERVIEW_CARDS = [
  { key: "views", label: "Views" },
  { key: "favorites", label: "Favorites" },
  { key: "cartAdds", label: "Cart Adds" },
  { key: "checkoutStarts", label: "Checkout Starts" },
  { key: "purchases", label: "Purchases" },
];

const EVENT_LABELS = {
  product_view: "Viewed",
  wishlist_added: "Favorited",
  wishlist_removed: "Unfavorited",
  cart_added: "Added to cart",
  cart_quantity_updated: "Updated cart quantity",
  cart_removed: "Removed from cart",
  checkout_started: "Started checkout",
  purchase_completed: "Purchased",
};

export default function SellerOverviewPage() {
  const { currency, getToken, user } = useAppContext();
  const [range, setRange] = useState("7d");
  const [productId, setProductId] = useState("");
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const { data } = await axios.get("/api/analytics/overview", {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          range,
          ...(productId ? { productId } : {}),
        },
      });

      if (data.success) {
        setAnalytics(data);
      }
    } catch (error) {
      console.error("[seller-overview] Failed to load analytics", error);
    } finally {
      setLoading(false);
    }
  }, [getToken, productId, range]);

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [fetchAnalytics, user]);

  const overview = analytics?.overview || {};
  const productRows = analytics?.products || [];
  const recentActivity = analytics?.recentActivity || [];
  const productOptions = analytics?.productOptions || [];

  const revenueDisplay = useMemo(
    () => `${currency || "$"}${Number(overview.revenue || 0).toFixed(2)}`,
    [currency, overview.revenue]
  );

  return (
    <div className="flex-1 min-h-screen flex flex-col justify-between bg-slate-50">
      {loading ? (
        <Loading />
      ) : (
        <div className="space-y-6 p-4 md:p-8">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-orange-600">
                  Store Activity
                </p>
                <h1 className="mt-2 text-2xl font-semibold text-slate-900">
                  Overview dashboard
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-500">
                  Views, favorites, cart activity, checkout starts, and purchases
                  are tracked directly inside the store.
                </p>
              </div>

              <div className="flex flex-col gap-3 lg:items-end">
                <div className="flex flex-wrap gap-2">
                  {RANGE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setRange(option.value)}
                      className={`rounded-full px-4 py-2 text-sm ${
                        range === option.value
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <select
                  value={productId}
                  onChange={(event) => setProductId(event.target.value)}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
                >
                  <option value="">All products</option>
                  {productOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
              {OVERVIEW_CARDS.map((card) => (
                <div
                  key={card.key}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                >
                  <p className="text-sm text-slate-500">{card.label}</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">
                    {Number(overview[card.key] || 0)}
                  </p>
                </div>
              ))}

              <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
                <p className="text-sm text-orange-700">Revenue</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">
                  {revenueDisplay}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Product funnel
              </h2>
              <p className="text-sm text-slate-500">
                Compare product performance across the shopping journey.
              </p>

              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-slate-500">
                    <tr>
                      <th className="pb-3 font-medium">Product</th>
                      <th className="pb-3 font-medium">Views</th>
                      <th className="pb-3 font-medium">Favorites</th>
                      <th className="pb-3 font-medium">Cart</th>
                      <th className="pb-3 font-medium">Checkout</th>
                      <th className="pb-3 font-medium">Purchases</th>
                      <th className="pb-3 font-medium">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {productRows.length ? (
                      productRows.map((row) => (
                        <tr key={row.productId}>
                          <td className="py-3 font-medium text-slate-800">
                            {row.name}
                          </td>
                          <td className="py-3 text-slate-600">{row.views}</td>
                          <td className="py-3 text-slate-600">
                            {row.favorites}
                          </td>
                          <td className="py-3 text-slate-600">
                            {row.cartAdds}
                          </td>
                          <td className="py-3 text-slate-600">
                            {row.checkoutStarts}
                          </td>
                          <td className="py-3 text-slate-600">
                            {row.purchases}
                          </td>
                          <td className="py-3 text-slate-600">
                            {currency || "$"}
                            {Number(row.revenue || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="py-6 text-slate-500" colSpan={7}>
                          No tracked activity for this filter yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Recent activity
              </h2>
              <p className="text-sm text-slate-500">
                Latest tracked store events.
              </p>

              <div className="mt-4 space-y-3">
                {recentActivity.length ? (
                  recentActivity.map((event) => (
                    <div
                      key={event.id}
                      className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-800">
                            {EVENT_LABELS[event.eventType] || event.eventType}
                          </p>
                          <p className="text-sm text-slate-500">
                            {event.productName}
                          </p>
                        </div>
                        <p className="text-xs text-slate-400">
                          {new Date(event.createdAt).toLocaleString()}
                        </p>
                      </div>

                      {(event.quantity > 1 || event.lineTotal > 0) && (
                        <p className="mt-2 text-sm text-slate-600">
                          Qty {event.quantity}
                          {event.lineTotal > 0
                            ? ` • ${currency || "$"}${Number(
                                event.lineTotal
                              ).toFixed(2)}`
                            : ""}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                    No recent activity yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      <Footer />
    </div>
  );
}
