// components/product/InfosV2.jsx
"use client";
import React, { useMemo, useState } from "react";
import { useAppContext } from "@/context/AppContext";
import ReviewSummary from "@/components/ReviewSummary";

const cx = (...xs) => xs.filter(Boolean).join(" ");

function Price({ product, format, selectedDimensions }) {
  const pricing = product?.pricing || {};
  const isPhysical = format === "physical";

  if (isPhysical) {
    const physicalPricing =
      product?.physicalPricing || pricing.physicalPricing || {};
    const defaultDimensions =
      selectedDimensions ||
      product?.defaultPhysicalDimensions ||
      Object.keys(physicalPricing)[0];
    const selected = physicalPricing[defaultDimensions] || null;

    const basePrice = Number(
      selected?.basePrice ??
        product?.price ??
        pricing.defaultPhysicalBasePrice ??
        0
    );
    const finalPrice = Number(
      selected?.finalPrice ??
        product?.finalPrice ??
        pricing.defaultPhysicalFinalPrice ??
        basePrice
    );

    const hasDiscount =
      basePrice > 0 && Math.abs(basePrice - finalPrice) > 0.009;
    const pct = hasDiscount
      ? Math.round(((basePrice - finalPrice) / basePrice) * 100)
      : 0;

    if (hasDiscount) {
      return (
        <div className="flex flex-wrap items-end gap-3">
          <span className="text-4xl font-black tracking-[-0.05em] text-blackhex md:text-[2.75rem]">
            ${finalPrice.toFixed(2)}
          </span>
          <span className="text-base font-semibold text-gray-400 line-through md:text-lg">
            ${basePrice.toFixed(2)}
          </span>
          <span className="inline-flex rounded-full bg-secondary/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-secondary">
            Save {pct}%
          </span>
        </div>
      );
    }

    return (
      <div className="text-4xl font-black tracking-[-0.05em] text-blackhex md:text-[2.75rem]">
        ${finalPrice.toFixed(2)}
      </div>
    );
  }

  const basePrice = Number(
    product?.digitalPrice ??
      pricing.digitalBasePrice ??
      pricing.defaultPhysicalBasePrice ??
      0
  );
  const finalPrice = Number(
    product?.digitalDisplayPrice ?? pricing.digitalFinalPrice ?? basePrice
  );
  const hasDiscount = basePrice > 0 && Math.abs(basePrice - finalPrice) > 0.009;
  const pct = hasDiscount
    ? Math.round(((basePrice - finalPrice) / basePrice) * 100)
    : 0;

  if (hasDiscount) {
    return (
      <div className="flex flex-wrap items-end gap-3">
        <span className="text-4xl font-black tracking-[-0.05em] text-blackhex md:text-[2.75rem]">
          ${finalPrice.toFixed(2)}
        </span>
        <span className="text-base font-semibold text-gray-400 line-through md:text-lg">
          ${basePrice.toFixed(2)}
        </span>
        <span className="inline-flex rounded-full bg-secondary/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-secondary">
          Save {pct}%
        </span>
      </div>
    );
  }

  return (
    <div className="text-4xl font-black tracking-[-0.05em] text-blackhex md:text-[2.75rem]">
      ${finalPrice.toFixed(2)}
    </div>
  );
}

function ReadMore({ text, limit = 120 }) {
  const [open, setOpen] = useState(false);
  if (!text) return null;
  const short = text.length > limit ? text.slice(0, limit).trim() + "…" : text;
  return (
    <div className="text-sm leading-7 text-gray-700">
      <span>{open ? text : short} </span>
      {text.length > limit && !open ? (
        <button
          className="font-semibold text-secondary transition hover:text-primary"
          onClick={() => setOpen(true)}
        >
          Read more
        </button>
      ) : null}
    </div>
  );
}

function Accordion({ title, children }) {
  const [open, setOpen] = useState(false);
  const id = useMemo(() => `acc_${title.replace(/\s+/g, "_")}`, [title]);

  return (
    <div className="border-b border-gray-200">
      <button
        className="flex w-full items-center justify-between py-4 text-left"
        aria-controls={id}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="text-sm font-semibold uppercase tracking-[0.18em] text-blackhex">
          {title}
        </span>
        <span
          className={`text-lg text-secondary transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        >
          ▾
        </span>
      </button>

      <div
        id={id}
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          open ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="pb-4 text-sm leading-7 text-gray-700">{children}</div>
      </div>
    </div>
  );
}

function OptionChip({ active, onClick, children, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "min-w-[84px] rounded-full border px-4 py-3 text-sm font-semibold transition duration-200",
        active
          ? "border-secondary bg-secondary text-white shadow-[0_10px_24px_rgba(109,40,217,0.28)]"
          : "border-gray-200 bg-white text-gray-700 hover:border-secondary/30 hover:bg-secondary/5",
        className
      )}
    >
      {children}
    </button>
  );
}

function DesktopSelectors({
  format,
  onFormatChange,
  sizes,
  selectedDimensions,
  onDimensionsChange,
  labelForIndex,
}) {
  return (
    <div className="hidden lg:block">
      <div className="rounded-[28px] border border-secondary/10 bg-[#fbf8ff] p-5 shadow-[0_12px_36px_rgba(109,40,217,0.08)]">
        <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-secondary">
          Customize your poster
        </div>

        <div className="mt-4">
          <div className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-gray-500">
            Product type
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { key: "physical", label: "Physical Print" },
              { key: "digital", label: "Digital Download" },
            ].map((opt) => (
              <OptionChip
                key={opt.key}
                active={format === opt.key}
                onClick={() => onFormatChange(opt.key)}
              >
                {opt.label}
              </OptionChip>
            ))}
          </div>
        </div>

        {sizes?.length ? (
          <div className="mt-5">
            <div className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-gray-500">
              Size
            </div>
            <div className="flex flex-wrap gap-2">
              {sizes.map((s, i) => {
                const dims = s.dimensions || s.size;
                const label = s.label || labelForIndex(i, s);
                return (
                  <OptionChip
                    key={`${label}-${dims}`}
                    active={selectedDimensions === dims}
                    onClick={() => onDimensionsChange(dims)}
                  >
                    <span className="block">{label}</span>
                    <span className="mt-0.5 block text-[11px] font-medium opacity-80">
                      {dims}
                    </span>
                  </OptionChip>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function MobileSelectorTabs({
  format,
  onFormatChange,
  sizes,
  selectedDimensions,
  onDimensionsChange,
  labelForIndex,
}) {
  const [activeTab, setActiveTab] = useState("product");

  const tabBase =
    "flex-1 rounded-full px-4 py-3 text-[11px] font-bold uppercase tracking-[0.16em] transition";

  return (
    <div className="rounded-[24px] border border-secondary/10 bg-white p-4 shadow-[0_12px_30px_rgba(17,24,39,0.08)] lg:hidden">
      <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.24em] text-secondary">
        Customize your poster
      </div>

      <div className="flex gap-2 rounded-full bg-[#f6f1ff] p-1">
        <button
          type="button"
          onClick={() => setActiveTab("product")}
          className={cx(
            tabBase,
            activeTab === "product"
              ? "bg-secondary text-white shadow-[0_8px_20px_rgba(109,40,217,0.24)]"
              : "text-secondary"
          )}
        >
          Product Type
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("size")}
          className={cx(
            tabBase,
            activeTab === "size"
              ? "bg-secondary text-white shadow-[0_8px_20px_rgba(109,40,217,0.24)]"
              : "text-secondary"
          )}
        >
          Size
        </button>
      </div>

      <div className="mt-4 min-h-[88px] rounded-[20px] bg-[#fcfbff] p-3">
        {activeTab === "product" ? (
          <div className="flex flex-wrap gap-2">
            {[
              { key: "physical", label: "Physical Print" },
              { key: "digital", label: "Digital Download" },
            ].map((opt) => (
              <OptionChip
                key={opt.key}
                active={format === opt.key}
                onClick={() => onFormatChange(opt.key)}
                className="min-w-0 flex-1"
              >
                {opt.label}
              </OptionChip>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {sizes.map((s, i) => {
              const dims = s.dimensions || s.size;
              const label = s.label || labelForIndex(i, s);
              return (
                <OptionChip
                  key={`${label}-${dims}`}
                  active={selectedDimensions === dims}
                  onClick={() => onDimensionsChange(dims)}
                >
                  <span className="block">{label}</span>
                  <span className="mt-0.5 block text-[11px] font-medium opacity-80">
                    {dims}
                  </span>
                </OptionChip>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Infos({
  product,
  selectedDimensions,
  onDimensionsChange,
  format,
  onFormatChange,
  mobileControlsOnly = false,
  hideMobileControls = false,
}) {
  const { addToCart } = useAppContext();
  const pricing = product?.pricing || {};

  const productId = useMemo(() => {
    const id = product?._id ?? product?.id;
    if (!id) return "";
    if (typeof id === "string") return id;
    if (typeof id === "object" && typeof id.toString === "function") {
      return id.toString();
    }
    return "";
  }, [product?._id, product?.id]);

  const sizes = useMemo(() => {
    if (
      Array.isArray(product?.physicalOptions) &&
      product.physicalOptions.length
    ) {
      return product.physicalOptions.map((option) => ({
        ...option,
        size: option.size || option.dimensions,
        dimensions: option.dimensions || option.size,
        label: option.label || option.key || option.size,
      }));
    }
    const variationSizes = product?.variations?.[0]?.sizes || [];
    return variationSizes.map((option, index) => ({
      ...option,
      size: option.size || option.dimensions,
      dimensions: option.dimensions || option.size,
      label:
        option.label || option.key || ["M", "L", "XL"][index] || option.size,
    }));
  }, [product]);

  const isPhysical = format === "physical";
  const printfulActive = Boolean(
    product?.isPrintfulEnabled ??
      product?.printfulEnabled ??
      product?.PrintfulEnabled
  );
  const physicalDisabled = isPhysical && !printfulActive;

  const physicalPricing =
    product?.physicalPricing || pricing?.physicalPricing || {};
  const defaultDimensions =
    selectedDimensions ||
    product?.defaultPhysicalDimensions ||
    Object.keys(physicalPricing)[0];
  const selectedPhysical = physicalPricing[defaultDimensions];

  const physicalPrice = Number(
    selectedPhysical?.finalPrice ??
      product?.finalPrice ??
      pricing?.defaultPhysicalFinalPrice ??
      0
  );
  const digitalPriceValue = Number(
    product?.digitalDisplayPrice ??
      pricing?.digitalFinalPrice ??
      product?.digitalPrice ??
      product?.finalPrice ??
      0
  );

  const effectivePrice = isPhysical ? physicalPrice : digitalPriceValue;

  const handleAdd = async () => {
    if (physicalDisabled) return;
    await addToCart({
      productId: product._id.toString(),
      title: product.name,
      imageUrl: product.imageUrl || product.image?.[0] || "",
      price: effectivePrice,
      quantity: 1,
      slug: product.slug,
      format,
      dimensions:
        format === "digital"
          ? "digital"
          : selectedDimensions || product?.defaultPhysicalDimensions || null,
    });
  };

  const labelForIndex = (i, s) => {
    if (s?.label) return s.label;
    if (sizes.length === 3) return ["M", "L", "XL"][i];
    const scale = ["S", "M", "L", "XL", "XXL"];
    return scale[i] || `#${i + 1}`;
  };

  const selectorProps = {
    format,
    onFormatChange,
    sizes,
    selectedDimensions,
    onDimensionsChange,
    labelForIndex,
  };

  if (mobileControlsOnly) {
    return <MobileSelectorTabs {...selectorProps} />;
  }

  return (
    <aside className="h-fit lg:sticky lg:top-8">
      {hideMobileControls ? null : <MobileSelectorTabs {...selectorProps} />}

      <DesktopSelectors {...selectorProps} />

      <div className="mt-5 rounded-[30px] border border-gray-200 bg-white p-6 shadow-[0_18px_42px_rgba(17,24,39,0.08)] md:p-7">
        <div className="inline-flex rounded-full bg-[#f6f1ff] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-secondary">
          Poster Genius
        </div>

        <h1 className="mt-4 text-4xl font-black leading-[0.95] tracking-[-0.06em] text-blackhex md:text-5xl">
          {product?.name || "Product"}
        </h1>

        <div className="mt-5">
          <Price
            product={product}
            format={format}
            selectedDimensions={selectedDimensions}
          />
        </div>

        <div className="mt-4 rounded-2xl border border-gray-100 bg-[#faf8ff] px-4 py-3">
          <ReviewSummary productId={productId} />
        </div>

        <div className="mt-5">
          <ReadMore text={product?.description || ""} limit={120} />
        </div>

        <div className="mt-6">
          <button
            onClick={handleAdd}
            disabled={physicalDisabled}
            className={cx(
              "h-14 w-full rounded-full font-bold uppercase tracking-[0.16em] text-white transition",
              "bg-primary shadow-[0_18px_32px_rgba(109,40,217,0.28)] hover:bg-tertiary",
              physicalDisabled && "cursor-not-allowed opacity-50"
            )}
          >
            Add To Cart
          </button>
          <p className="mt-3 text-center text-xs font-medium uppercase tracking-[0.18em] text-gray-500">
            Enjoy free shipping over $50
          </p>
        </div>

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
      </div>
    </aside>
  );
}
