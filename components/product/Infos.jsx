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
          <span className="text-[2rem] font-black tracking-[-0.04em] text-blackhex md:text-[2.25rem]">
            ${finalPrice.toFixed(2)}
          </span>
          <span className="text-sm font-semibold text-gray-400 line-through md:text-base">
            ${basePrice.toFixed(2)}
          </span>
          <span className="inline-flex rounded-full bg-secondary/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-secondary">
            Save {pct}%
          </span>
        </div>
      );
    }

    return (
      <div className="text-[2rem] font-black tracking-[-0.04em] text-blackhex md:text-[2.25rem]">
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
        <span className="text-[2rem] font-black tracking-[-0.04em] text-blackhex md:text-[2.25rem]">
          ${finalPrice.toFixed(2)}
        </span>
        <span className="text-sm font-semibold text-gray-400 line-through md:text-base">
          ${basePrice.toFixed(2)}
        </span>
        <span className="inline-flex rounded-full bg-secondary/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-secondary">
          Save {pct}%
        </span>
      </div>
    );
  }

  return (
    <div className="text-[2rem] font-black tracking-[-0.04em] text-blackhex md:text-[2.25rem]">
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

function PillGroup({ children, className }) {
  return (
    <div
      className={cx(
        "inline-flex flex-wrap items-center gap-1 rounded-full bg-gray-100 p-1",
        className
      )}
    >
      {children}
    </div>
  );
}

function OptionChip({ active, onClick, children, className, tone = "default" }) {
  const activeClasses =
    tone === "size"
      ? "border-secondary bg-white text-secondary shadow-sm"
      : "border-gray-200 bg-white text-gray-900 shadow-sm";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "min-w-[84px] whitespace-nowrap rounded-full border px-4 py-2 text-[13px] font-medium transition duration-200",
        active
          ? activeClasses
          : "border-transparent bg-transparent text-gray-600 hover:text-gray-900",
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
      <div className="rounded-[28px] border border-secondary/10 bg-[#fbf8ff] p-5">
        <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-secondary">
          Customize your poster
        </div>

        <div className="mt-4">
          <div className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-gray-500">
            Product type
          </div>
          <PillGroup className="w-full">
            {[
              { key: "physical", label: "Physical Print" },
              { key: "digital", label: "Digital Download" },
            ].map((opt) => (
              <OptionChip
                key={opt.key}
                active={format === opt.key}
                onClick={() => onFormatChange(opt.key)}
                className="flex-1"
              >
                {opt.label}
              </OptionChip>
            ))}
          </PillGroup>
        </div>

        {sizes?.length ? (
          <div className="mt-5">
            <div className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-gray-500">
              Size
            </div>
            <PillGroup>
              {sizes.map((s, i) => {
                const dims = s.dimensions || s.size;
                const label = s.label || labelForIndex(i, s);
                return (
                  <OptionChip
                    key={`${label}-${dims}`}
                    active={selectedDimensions === dims}
                    onClick={() => onDimensionsChange(dims)}
                    tone="size"
                  >
                    {selectedDimensions === dims ? `${label} (${dims})` : label}
                  </OptionChip>
                );
              })}
            </PillGroup>
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
  const [activePanel, setActivePanel] = useState(
    format === "digital" ? "product" : "size"
  );

  const showSizePanel = format !== "digital";

  React.useEffect(() => {
    if (format === "digital" && activePanel === "size") {
      setActivePanel("product");
    }
  }, [activePanel, format]);

  return (
    <div className="rounded-[24px] border border-secondary/10 bg-white p-4 lg:hidden">
      <div className="flex justify-center">
        <PillGroup className="justify-center">
          {showSizePanel ? (
            <button
              type="button"
              onClick={() => setActivePanel("size")}
              className={cx(
                "rounded-full px-5 py-2 text-[15px] font-medium transition",
                activePanel === "size"
                  ? "border border-secondary/20 bg-white text-secondary shadow-sm"
                  : "text-gray-600"
              )}
            >
              Size
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setActivePanel("product")}
            className={cx(
              "rounded-full px-5 py-2 text-[15px] font-medium transition",
              activePanel === "product"
                ? "border border-secondary/20 bg-white text-secondary shadow-sm"
                : "text-gray-600"
            )}
          >
            Product Type
          </button>
        </PillGroup>
      </div>

      <div className="mt-4 text-center">
        <div className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-gray-500">
          {activePanel === "size" && showSizePanel ? "Size (inches)" : "Product type"}
        </div>

        {activePanel === "size" && showSizePanel ? (
          <PillGroup>
            {sizes.map((s, i) => {
              const dims = s.dimensions || s.size;
              const label = s.label || labelForIndex(i, s);
              return (
                <OptionChip
                  key={`${label}-${dims}`}
                  active={selectedDimensions === dims}
                  onClick={() => onDimensionsChange(dims)}
                  tone="size"
                >
                  {selectedDimensions === dims ? `${label} (${dims})` : label}
                </OptionChip>
              );
            })}
          </PillGroup>
        ) : (
          <PillGroup className="w-full">
            {[
              { key: "physical", label: "Physical Print" },
              { key: "digital", label: "Digital Download" },
            ].map((opt) => (
              <OptionChip
                key={opt.key}
                active={format === opt.key}
                onClick={() => onFormatChange(opt.key)}
                className="flex-1"
              >
                {opt.label}
              </OptionChip>
            ))}
          </PillGroup>
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
  controlsOnly = false,
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
    sizes: format === "digital" ? [] : sizes,
    selectedDimensions,
    onDimensionsChange,
    labelForIndex,
  };

  if (controlsOnly) {
    return <MobileSelectorTabs {...selectorProps} />;
  }

  return (
    <aside className="h-fit">
      <div className="mt-5 rounded-[30px] border border-gray-200 bg-white p-6 shadow-[0_12px_28px_rgba(17,24,39,0.06)] md:p-7">
        <div className="inline-flex rounded-full bg-[#f6f1ff] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-secondary">
          Poster Genius
        </div>

        <h1 className="mt-4 text-[1.8rem] font-black leading-[0.98] tracking-[-0.05em] text-blackhex md:text-[2.15rem]">
          {product?.name || "Product"}
        </h1>

        <div className="mt-4">
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
              "h-12 w-full rounded-full font-bold uppercase tracking-[0.16em] text-white transition",
              "bg-primary hover:bg-tertiary",
              physicalDisabled && "cursor-not-allowed opacity-50"
            )}
          >
            Add To Cart
          </button>
          <p className="mt-3 text-center text-[10px] font-medium uppercase tracking-[0.18em] text-gray-500">
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

      <div className="mt-5 hidden lg:block">
        <DesktopSelectors {...selectorProps} />
      </div>
    </aside>
  );
}
