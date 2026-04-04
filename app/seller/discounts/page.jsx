"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { buildBannerMessage } from "@/lib/promoBanner";

const defaultFormState = {
  code: "",
  type: "flat",
  appliesTo: "all",
  condition: "none",
  value: "0",
  minCartValue: "",
  minQuantity: "",
  expiresAt: "",
  isActive: true,
  showInBanner: false,
};

const typeLabels = {
  flat: "Flat Amount",
  percent: "Percentage",
  shipping: "Free Shipping",
};

const conditionLabels = {
  none: "No Condition",
  cartValue: "Minimum Cart Value",
  quantity: "Minimum Quantity",
};

const appliesToLabels = {
  all: "All Products",
  digital: "Digital Products",
  physical: "Physical Posters",
};

const getPromoStatus = (promo) => {
  if (!promo) return "inactive";
  const now = Date.now();
  const expiresAt = promo.expiresAt ? new Date(promo.expiresAt).getTime() : null;
  if (expiresAt && expiresAt <= now) return "expired";
  if (!promo.isActive) return "inactive";
  return "active";
};

const formatDateTime = (value) => {
  if (!value) return "No expiry";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No expiry";
  return date.toLocaleString();
};

const formatPromoSummary = (promo) => {
  if (promo.type === "shipping") return "Free shipping";
  if (promo.type === "percent") return `${promo.value}% off`;
  return `$${Number(promo.value ?? 0).toFixed(2)} off`;
};

function PromoCard({ promo, onReactivate, isUpdating }) {
  const status = getPromoStatus(promo);
  const bannerPreview = buildBannerMessage(promo);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-blackhex">{promo.code}</h3>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${
                status === "active"
                  ? "bg-green-100 text-green-700"
                  : status === "expired"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {status}
            </span>
            {promo.showInBanner && (
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                Banner
              </span>
            )}
          </div>
          <p className="text-sm text-gray-700">
            {formatPromoSummary(promo)} for{" "}
            {appliesToLabels[promo.appliesTo] || appliesToLabels.all}
          </p>
          <div className="grid gap-1 text-sm text-gray-500">
            <p>Condition: {conditionLabels[promo.condition] || "No Condition"}</p>
            <p>Expires: {formatDateTime(promo.expiresAt)}</p>
            {promo.showInBanner && bannerPreview && (
              <p>Banner copy: {bannerPreview}</p>
            )}
          </div>
        </div>

        {(status === "expired" || status === "inactive") && (
          <button
            type="button"
            onClick={() => onReactivate(promo)}
            disabled={isUpdating}
            className="rounded-md border border-black px-4 py-2 text-sm font-semibold text-black transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isUpdating ? "Reactivating..." : "Reactivate"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function DiscountsPage() {
  const [form, setForm] = useState(defaultFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [promos, setPromos] = useState([]);
  const [isLoadingPromos, setIsLoadingPromos] = useState(true);
  const [updatingPromoId, setUpdatingPromoId] = useState(null);
  const [activeTab, setActiveTab] = useState("active");

  const fetchPromos = async () => {
    try {
      setIsLoadingPromos(true);
      const response = await fetch("/api/promo/create", { cache: "no-store" });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load promos");
      }

      setPromos(Array.isArray(data.promos) ? data.promos : []);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoadingPromos(false);
    }
  };

  useEffect(() => {
    fetchPromos();
  }, []);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.code.trim()) {
      toast.error("Promo code is required");
      return;
    }

    if (form.type !== "shipping" && Number(form.value) <= 0) {
      toast.error("Value must be greater than zero");
      return;
    }

    if (form.type === "shipping" && form.appliesTo === "digital") {
      toast.error("Free shipping promos must target physical posters or all products");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        type: form.type,
        appliesTo: form.appliesTo,
        condition: form.condition,
        value: form.type === "shipping" ? 0 : Number(form.value),
        minCartValue:
          form.condition === "cartValue" && form.minCartValue !== ""
            ? Number(form.minCartValue)
            : undefined,
        minQuantity:
          form.condition === "quantity" && form.minQuantity !== ""
            ? Number(form.minQuantity)
            : undefined,
        expiresAt: form.expiresAt || undefined,
        isActive: form.isActive,
        showInBanner: form.showInBanner,
      };

      const response = await fetch("/api/promo/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to create promo");
      }

      toast.success("Promo created!");
      setForm(defaultFormState);
      setActiveTab("active");
      await fetchPromos();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReactivate = async (promo) => {
    try {
      setUpdatingPromoId(promo._id);
      const response = await fetch("/api/promo/create", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: promo._id, action: "reactivate" }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to reactivate promo");
      }

      toast.success("Promo reactivated with no expiry");
      await fetchPromos();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setUpdatingPromoId(null);
    }
  };

  const showMinCartValue = form.condition === "cartValue";
  const showMinQuantity = form.condition === "quantity";
  const bannerPreview = buildBannerMessage({
    code: form.code.trim().toUpperCase() || "PROMO",
    type: form.type,
    value: form.type === "shipping" ? 0 : Number(form.value || 0),
    appliesTo: form.appliesTo,
  });

  const { activePromos, archivedPromos } = useMemo(() => {
    const active = [];
    const archived = [];

    promos.forEach((promo) => {
      const status = getPromoStatus(promo);
      if (status === "active") {
        active.push(promo);
      } else {
        archived.push(promo);
      }
    });

    return { activePromos: active, archivedPromos: archived };
  }, [promos]);

  const promoList = activeTab === "active" ? activePromos : archivedPromos;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 p-8">
      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h1 className="mb-6 text-3xl font-semibold">Create Promo Code</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium">
              Code
              <input
                name="code"
                placeholder="SUMMER25"
                className="rounded border border-gray-300 px-3 py-2 uppercase focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={form.code}
                onChange={handleChange}
                required
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium">
              Type
              <select
                name="type"
                className="rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={form.type}
                onChange={handleChange}
              >
                {Object.entries(typeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium">
              Condition
              <select
                name="condition"
                className="rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={form.condition}
                onChange={handleChange}
              >
                {Object.entries(conditionLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium">
              Applies To
              <select
                name="appliesTo"
                className="rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={form.appliesTo}
                onChange={handleChange}
              >
                {Object.entries(appliesToLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium">
              Value
              <input
                name="value"
                type="number"
                min={0}
                step="0.01"
                placeholder="10"
                className="rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={form.value}
                onChange={handleChange}
                disabled={form.type === "shipping"}
              />
              <span className="text-xs text-gray-500">
                {form.type === "percent"
                  ? "Percentage discount (e.g. 15 for 15%)"
                  : form.type === "flat"
                  ? "Flat discount amount"
                  : "Shipping will be waived when applied"}
              </span>
            </label>

            {showMinCartValue && (
              <label className="flex flex-col gap-2 text-sm font-medium">
                Minimum Cart Value
                <input
                  name="minCartValue"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="100"
                  className="rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={form.minCartValue}
                  onChange={handleChange}
                />
              </label>
            )}

            {showMinQuantity && (
              <label className="flex flex-col gap-2 text-sm font-medium">
                Minimum Quantity
                <input
                  name="minQuantity"
                  type="number"
                  min={0}
                  placeholder="3"
                  className="rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={form.minQuantity}
                  onChange={handleChange}
                />
              </label>
            )}

            <label className="flex flex-col gap-2 text-sm font-medium">
              Expires At
              <input
                name="expiresAt"
                type="datetime-local"
                className="rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={form.expiresAt}
                onChange={handleChange}
              />
            </label>

            <label className="flex items-center gap-3 text-sm font-medium">
              <input
                type="checkbox"
                name="isActive"
                checked={form.isActive}
                onChange={handleChange}
                className="h-4 w-4"
              />
              Active Promo
            </label>

            <label className="flex items-center gap-3 text-sm font-medium md:col-span-2">
              <input
                type="checkbox"
                name="showInBanner"
                checked={form.showInBanner}
                onChange={handleChange}
                className="h-4 w-4"
              />
              Show this promo in the top banner
            </label>
          </div>

          {form.showInBanner && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <p className="text-sm font-semibold text-primary">Banner Preview</p>
              <p className="mt-2 text-sm text-gray-700">{bannerPreview}</p>
              <p className="mt-2 text-xs text-gray-500">
                Turning this on will replace any previously active banner promo.
              </p>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="rounded-md bg-primary px-5 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save Promo"}
            </button>
            <button
              type="button"
              onClick={() => setForm(defaultFormState)}
              className="rounded-md border border-gray-300 px-5 py-2 text-gray-700"
            >
              Reset
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-blackhex">Promo Library</h2>
            <p className="text-sm text-gray-500">
              Review current promos, expired codes, and reactivate older offers.
            </p>
          </div>
          <div className="inline-flex w-fit rounded-full border border-gray-300 p-1">
            <button
              type="button"
              onClick={() => setActiveTab("active")}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                activeTab === "active"
                  ? "bg-black text-white"
                  : "text-gray-600"
              }`}
            >
              Active ({activePromos.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("expired")}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                activeTab === "expired"
                  ? "bg-black text-white"
                  : "text-gray-600"
              }`}
            >
              Expired / Inactive ({archivedPromos.length})
            </button>
          </div>
        </div>

        {isLoadingPromos ? (
          <p className="text-sm text-gray-500">Loading promos...</p>
        ) : promoList.length === 0 ? (
          <p className="text-sm text-gray-500">
            {activeTab === "active"
              ? "No active promos yet."
              : "No expired or inactive promos yet."}
          </p>
        ) : (
          <div className="space-y-4">
            {promoList.map((promo) => (
              <PromoCard
                key={promo._id}
                promo={promo}
                onReactivate={handleReactivate}
                isUpdating={updatingPromoId === promo._id}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
