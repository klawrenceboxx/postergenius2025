"use client";
import React, {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { assets } from "@/assets/assets";
import Image from "next/image";
import { useAppContext } from "@/context/AppContext";
import Footer from "@/components/seller/Footer";
import Loading from "@/components/Loading";
import axios from "axios";
import toast from "react-hot-toast";
import { getOptimizedImageProps } from "@/lib/imageUtils";

const POLL_INTERVAL = 15000;
const ALL_FILTER = "all";

const STATUS_COLORS = {
  "Awaiting Fulfillment": "bg-gray-200 text-gray-800",
  "In Production": "bg-orange-200 text-orange-800",
  Shipped: "bg-blue-200 text-blue-800",
  Delivered: "bg-green-200 text-green-800",
  "Fulfillment Failed": "bg-red-200 text-red-800",
};

const CATEGORY_COLORS = {
  physical: "bg-sky-100 text-sky-700",
  digital: "bg-violet-100 text-violet-700",
  tracked: "bg-emerald-100 text-emerald-700",
  untracked: "bg-gray-200 text-gray-700",
  failed: "bg-rose-100 text-rose-700",
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

const FilterBadge = ({ label, tone }) => (
  <span
    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
      CATEGORY_COLORS[tone] || "bg-slate-100 text-slate-700"
    }`}
  >
    {label}
  </span>
);

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
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState(ALL_FILTER);
  const [statusFilter, setStatusFilter] = useState(ALL_FILTER);
  const [categoryFilter, setCategoryFilter] = useState(ALL_FILTER);

  const deferredSearchQuery = useDeferredValue(searchQuery);

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

  const normalizedOrders = useMemo(
    () =>
      orders.map((order) => {
        const isPhysical = order.type === "physical";
        const amountValue = Number(
          order.amount ?? order.totalPrice ?? order.subtotal ?? 0
        );
        const address = order.address || {};
        const items = Array.isArray(order.items) ? order.items : [];
        const productsSummary = items
          .map((item) => {
            const productName =
              item?.product?.name || item?.productName || "Unknown Product";
            return `${productName} × ${item.quantity}`;
          })
          .join(", ");
        const firstProductWithImage = items.find(
          (item) =>
            Array.isArray(item?.product?.image) && item.product.image.length > 0
        );
        const primaryImage =
          firstProductWithImage?.product?.image?.[0] || assets.box_icon;
        const categories = [];

        categories.push(isPhysical ? "physical" : "digital");

        if (order.trackingUrl) {
          categories.push("tracked");
        } else if (isPhysical) {
          categories.push("untracked");
        }

        if (order.fulfillmentError || order.status === "Fulfillment Failed") {
          categories.push("failed");
        }

        const searchableText = [
          order._id,
          order.status,
          order.type,
          order.printfulStatus,
          order.shippingService,
          address?.fullName,
          address?.city,
          address?.state,
          productsSummary,
          ...items.map((item) => item?.product?.category || ""),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const categoriesForProducts = Array.from(
          new Set(
            items
              .map((item) => item?.product?.category)
              .filter(Boolean)
          )
        );

        return {
          ...order,
          isPhysical,
          amountValue,
          address,
          items,
          primaryImage,
          productsSummary,
          quickCategories: categories,
          productCategories: categoriesForProducts,
          searchableText,
        };
      }),
    [orders]
  );

  const statusOptions = useMemo(
    () =>
      Array.from(
        new Set(normalizedOrders.map((order) => order.status).filter(Boolean))
      ),
    [normalizedOrders]
  );

  const categoryOptions = useMemo(
    () =>
      Array.from(
        new Set(
          normalizedOrders.flatMap((order) => [
            ...order.quickCategories,
            ...order.productCategories,
          ])
        )
      ),
    [normalizedOrders]
  );

  const filteredOrders = useMemo(() => {
    const normalizedQuery = deferredSearchQuery.trim().toLowerCase();

    return normalizedOrders.filter((order) => {
      if (typeFilter !== ALL_FILTER && order.type !== typeFilter) {
        return false;
      }

      if (statusFilter !== ALL_FILTER && order.status !== statusFilter) {
        return false;
      }

      if (
        categoryFilter !== ALL_FILTER &&
        !order.quickCategories.includes(categoryFilter) &&
        !order.productCategories.includes(categoryFilter)
      ) {
        return false;
      }

      if (normalizedQuery && !order.searchableText.includes(normalizedQuery)) {
        return false;
      }

      return true;
    });
  }, [
    normalizedOrders,
    deferredSearchQuery,
    typeFilter,
    statusFilter,
    categoryFilter,
  ]);

  const renderedOrders = useMemo(
    () =>
      filteredOrders.map((order) => {
        const amountDisplay = `${currency}${order.amountValue.toFixed(2)}`;
        const address = order.address || {};
        const categoryBadges = [
          order.isPhysical
            ? { label: "Physical", tone: "physical" }
            : { label: "Digital", tone: "digital" },
          ...(order.trackingUrl
            ? [{ label: "Tracking live", tone: "tracked" }]
            : order.isPhysical
            ? [{ label: "No tracking yet", tone: "untracked" }]
            : []),
          ...(order.fulfillmentError || order.status === "Fulfillment Failed"
            ? [{ label: "Needs attention", tone: "failed" }]
            : []),
          ...order.productCategories.slice(0, 2).map((category) => ({
            label: category,
            tone: undefined,
          })),
        ];

        return (
          <div
            key={order._id}
            className="border border-gray-200 rounded-lg p-5 space-y-4 bg-white shadow-sm"
          >
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div className="flex gap-4">
                <Image
                  {...getOptimizedImageProps(order.primaryImage, {
                    variant: "thumbnail",
                  })}
                  className="h-16 w-16 rounded-lg border border-gray-200 object-cover bg-gray-100"
                  alt={order.productsSummary || "Order product image"}
                />
                <div className="space-y-1 text-sm">
                  <p className="font-semibold text-gray-900">
                    {order.productsSummary || "Order items unavailable"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {categoryBadges.map((badge) => (
                      <FilterBadge
                        key={`${order._id}-${badge.label}`}
                        label={badge.label}
                        tone={badge.tone}
                      />
                    ))}
                  </div>
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

            {order.isPhysical && (
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
    [filteredOrders, currency]
  );

  return (
    <div className="flex-1 h-screen overflow-scroll flex flex-col justify-between text-sm bg-gray-50">
      {loading ? (
      <Loading />
      ) : (
        <div className="md:p-10 p-4 space-y-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Orders</h2>
              <p className="text-xs text-gray-500">
                Auto-refreshing every {POLL_INTERVAL / 1000} seconds
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Search
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Order, product, customer"
                  className="min-w-[220px] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-orange-500"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Type
                </span>
                <select
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value)}
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-orange-500"
                >
                  <option value={ALL_FILTER}>All types</option>
                  <option value="physical">Physical</option>
                  <option value="digital">Digital</option>
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Status
                </span>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-orange-500"
                >
                  <option value={ALL_FILTER}>All statuses</option>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Quick category
                </span>
                <select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-orange-500"
                >
                  <option value={ALL_FILTER}>All categories</option>
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
            <span>{filteredOrders.length} shown</span>
            <span>of</span>
            <span>{orders.length} total orders</span>
          </div>

          <div className="space-y-4">
            {renderedOrders.length > 0 ? (
              renderedOrders
            ) : (
              <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
                No orders match the current filters.
              </div>
            )}
          </div>
        </div>
      )}
      <Footer />
    </div>
  );
};

export default Orders;
