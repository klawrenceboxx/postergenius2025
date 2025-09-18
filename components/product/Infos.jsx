// components/product/InfosV2.jsx
"use client";
import React, { useMemo, useState } from "react";
import { useAppContext } from "@/context/AppContext";

// tiny helper
const cx = (...xs) => xs.filter(Boolean).join(" ");

function Price({ product, format }) {
  const isPhysical = format === "physical";
  const base = isPhysical
    ? product.price
    : product.digitalPrice ?? product.finalPrice;
  const sale = isPhysical ? product.salePrice : undefined;

  if (isPhysical && sale && sale < product.price) {
    const pct = Math.round(((product.price - sale) / product.price) * 100);
    return (
      <div className="flex items-baseline gap-3">
        <span className="text-2xl font-semibold">${sale.toFixed(2)}</span>
        <span className="text-gray-400 line-through">
          ${product.price.toFixed(2)}
        </span>
        <span className="text-green-600 text-sm font-medium">Save {pct}%</span>
      </div>
    );
  }
  return <div className="text-2xl font-semibold">${base.toFixed(2)}</div>;
}

function ReadMore({ text, limit = 50 }) {
  const [open, setOpen] = useState(false);
  if (!text) return null;
  const short = text.length > limit ? text.slice(0, limit).trim() + "…" : text;
  return (
    <div className="text-sm text-gray-700 leading-relaxed">
      <span>{open ? text : short} </span>
      {text.length > limit && !open && (
        <button
          className="text-blue-600 hover:underline font-medium"
          onClick={() => setOpen(true)}
        >
          Read more
        </button>
      )}
    </div>
  );
}

// --- Animated Accordion (simple) ---
function Accordion({ title, children }) {
  const [open, setOpen] = useState(false);
  const id = useMemo(() => `acc_${title.replace(/\s+/g, "_")}`, [title]);

  return (
    <div className="border-b border-gray-200">
      <button
        className="w-full flex items-center justify-between py-4 text-left"
        aria-controls={id}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="font-medium">{title}</span>
        <span
          className={`transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        >
          ▾
        </span>
      </button>

      {/* Animate max-height + opacity instead of toggling display */}
      <div
        id={id}
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          open ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="pb-4 text-sm text-gray-700">{children}</div>
      </div>
    </div>
  );
}

export default function InfosV2({
  product,
  selectedDimensions,
  onDimensionsChange,
  format,
  onFormatChange,
}) {
  const { addToCart } = useAppContext();

  const sizes = useMemo(() => {
    // prefer flat sizes if present; otherwise variations[0].sizes
    if (Array.isArray(product?.sizes) && product.sizes.length)
      return product.sizes;
    return product?.variations?.[0]?.sizes || [];
  }, [product]);

  const isPhysical = format === "physical";
  const physicalDisabled = isPhysical && !product?.printfulEnabled; // flip per product when Printful is ready

  const effectivePrice = isPhysical
    ? product.salePrice ?? product.finalPrice
    : product.digitalPrice ?? product.finalPrice;

  const handleAdd = async () => {
    if (physicalDisabled) return;
    await addToCart({
      productId: product._id.toString(), // ✅ use productId, not _id
      title: product.title,
      imageUrl: product.imageUrl || product.image?.[0] || "",
      price: effectivePrice,
      quantity: 1,
      slug: product.slug,
      format,
      dimensions: selectedDimensions || null, // ✅ correct key
    });
  };

  const labelForIndex = (i, s) => {
    if (s?.label) return s.label;
    if (sizes.length === 3) return ["M", "L", "XL"][i];
    const scale = ["S", "M", "L", "XL", "XXL"];
    return scale[i] || `#${i + 1}`;
  };

  return (
    <aside className="lg:sticky lg:top-8 h-fit">
      {/* Title */}
      <h1 className="text-3xl font-semibold mb-2">
        {product?.title || product?.name || "Product"}
      </h1>

      {/* Price */}
      <Price product={product} format={format} />

      {/* Short description (first 50 chars) with Read more */}
      <div className="mt-6">
        <ReadMore text={product?.description || ""} limit={50} />
      </div>

      {/* Format segmented control — logic unchanged */}
      <div className="mt-5">
        <div className="inline-flex rounded-full bg-gray-100 p-1">
          {[
            { key: "physical", label: "Physical Print" },
            { key: "digital", label: "Digital Download" },
          ].map((opt) => {
            const active = format === opt.key;
            return (
              <button
                key={opt.key}
                aria-pressed={active}
                onClick={() => onFormatChange(opt.key)}
                className={cx(
                  "px-4 py-2 text-sm rounded-full transition",
                  active
                    ? "bg-white shadow border text-gray-900"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Size segmented control */}
      {sizes?.length > 0 && (
        <div className="mt-6">
          <div className="text-xs uppercase text-gray-500 mb-2">
            Size (inches)
          </div>

          <div className="inline-flex items-center gap-2 bg-gray-100 rounded-full p-1">
            {sizes.map((s, i) => {
              const dims = s.dimensions || s.size; // "12x18"
              const label = labelForIndex(i, s); // "M", "L", "XL"
              const sel = selectedDimensions === dims;

              return (
                <button
                  key={`${label}-${dims}`}
                  onClick={() => onDimensionsChange(dims)}
                  className={`px-3 py-2 text-sm font-medium rounded-full 
                    transition-colors transition-shadow duration-200 ease-in-out
                    ${
                      sel
                        ? "bg-white text-secondary border border-secondary shadow"
                        : "text-gray-700 hover:bg-gray-200"
                    }`}
                  style={{ minWidth: 60 }}
                >
                  {sel ? `${label} (${dims})` : label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* CTA + free shipping note */}
      <div className="mt-6">
        <button
          onClick={handleAdd}
          disabled={physicalDisabled}
          className={cx(
            "w-full h-14 rounded-full font-semibold text-white transition",
            "bg-primary hover:bg-tertiary",
            physicalDisabled && "opacity-50 cursor-not-allowed"
          )}
        >
          {/* ${effectivePrice.toFixed(2)} ADD TO CART */}
          ADD TO CART
        </button>
        <p className="text-xs text-gray-500 text-center mt-2">
          Enjoy free shipping over $50
        </p>
      </div>

      {/* Short description (first 50 chars) with Read more */}
      <div className="mt-6">
        <ReadMore text={product?.description || ""} limit={50} />
      </div>

      {/* Details / Shipping / Returns accordions */}
      <div className="mt-6 divide-y divide-gray-100 border-t border-gray-200">
        <Accordion title="Details">
          <div className="text-sm text-gray-700">
            Premium materials and high-resolution print.
          </div>
        </Accordion>
        <Accordion title="Shipping">
          <div className="text-sm text-gray-700">
            Ships in 3–5 business days. Tracking provided.
          </div>
        </Accordion>
        <Accordion title="Returns">
          <div className="text-sm text-gray-700">
            30-day return policy. Contact support for assistance.
          </div>
        </Accordion>
      </div>
    </aside>
  );
}
