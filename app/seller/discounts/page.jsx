"use client";

import { useState } from "react";
import toast from "react-hot-toast";

export const metadata = {
  title: "Seller Discounts | PosterGenius",
  description:
    "Create promo codes and manage discount conditions for PosterGenius customers from the seller tools.",
  alternates: { canonical: "https://postergenius.ca/seller/discounts" },
  openGraph: {
    title: "Seller Discounts | PosterGenius",
    description:
      "Create promo codes and manage discount conditions for PosterGenius customers from the seller tools.",
    url: "https://postergenius.ca/seller/discounts",
    siteName: "PosterGenius",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Seller Discounts | PosterGenius",
    description:
      "Create promo codes and manage discount conditions for PosterGenius customers from the seller tools.",
  },
};

const defaultFormState = {
  code: "",
  type: "flat",
  condition: "none",
  value: "0",
  minCartValue: "",
  minQuantity: "",
  expiresAt: "",
  isActive: true,
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

export default function DiscountsPage() {
  const [form, setForm] = useState(defaultFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    setIsSubmitting(true);

    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        type: form.type,
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
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const showMinCartValue = form.condition === "cartValue";
  const showMinQuantity = form.condition === "quantity";

  return (
    <div className="p-8 max-w-3xl mx-auto w-full">
      <h1 className="text-3xl font-semibold mb-6">
        Seller Discounts | PosterGenius
      </h1>
      <form
        onSubmit={handleSubmit}
        className="space-y-6 bg-white shadow-sm rounded-lg p-6 border border-gray-100"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-medium">
            Code
            <input
              name="code"
              placeholder="SUMMER25"
              className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50 uppercase"
              value={form.code}
              onChange={handleChange}
              required
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium">
            Type
            <select
              name="type"
              className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
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
              className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
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
            Value
            <input
              name="value"
              type="number"
              min={0}
              step="0.01"
              placeholder="10"
              className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
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
                className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
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
                className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
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
              className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
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
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="bg-primary text-white px-5 py-2 rounded-md disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Save Promo"}
          </button>
          <button
            type="button"
            onClick={() => setForm(defaultFormState)}
            className="px-5 py-2 rounded-md border border-gray-300 text-gray-700"
          >
            Reset
          </button>
        </div>
      </form>
    </div>
  );
}
