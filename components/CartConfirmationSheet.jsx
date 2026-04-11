"use client";

import { useEffect } from "react";
import Image from "next/image";
import { ArrowRight, ShoppingBag, Sparkles, X } from "lucide-react";
import { getOptimizedImageProps } from "@/lib/imageUtils";

const formatMeta = (item) => {
  if (!item) return "";

  const format =
    item.format === "digital" ? "Digital download" : "Physical poster";

  if (item.format === "digital") {
    return format;
  }

  if (item.dimensions && item.dimensions !== "digital") {
    return `${format} • ${item.dimensions}`;
  }

  return format;
};

export default function CartConfirmationSheet({
  open,
  item,
  onClose,
  onProceedToCart,
  currency = "$",
  cartCount = 0,
  cartAmount = 0,
}) {
  useEffect(() => {
    if (!open || typeof document === "undefined") {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, open]);

  if (!item) {
    return null;
  }

  const itemPrice = Number(item.price || 0);
  const imageUrl = item.imageUrl || "";

  return (
    <div
      className={[
        "fixed inset-0 z-[95] transition-opacity duration-300",
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
      ].join(" ")}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label="Close cart confirmation"
        onClick={onClose}
        className="absolute inset-0 bg-[rgba(15,23,42,0.22)] backdrop-blur-[2px]"
      />

      <aside
        className={[
          "absolute pointer-events-auto overflow-hidden border border-white/70 bg-[linear-gradient(180deg,#ffffff_0%,#fbf7ff_100%)] shadow-[0_30px_90px_rgba(38,22,74,0.18)] transition-transform duration-300 ease-out",
          "bottom-0 left-0 right-0 max-h-[88vh] rounded-t-[32px]",
          open ? "translate-y-0 md:translate-x-0" : "translate-y-full md:translate-x-[110%] md:translate-y-0",
          "md:bottom-6 md:left-auto md:right-6 md:top-6 md:w-[440px] md:max-w-[calc(100vw-3rem)] md:rounded-[32px]",
        ].join(" ")}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-confirmation-title"
      >
        <div className="flex h-full max-h-[88vh] flex-col">
          <div className="flex items-start justify-between border-b border-secondary/10 px-5 pb-4 pt-5 md:px-6 md:pt-6">
            <div>
              <div className="inline-flex rounded-full bg-[#f5ecff] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-secondary">
                Poster Genius
              </div>
              <h2
                id="cart-confirmation-title"
                className="mt-3 text-[1.8rem] font-black leading-none tracking-[-0.05em] text-blackhex"
              >
                Added to cart
              </h2>
              <p className="mt-2 max-w-[28ch] text-sm leading-6 text-gray-600">
                Your poster is ready. Continue browsing or head straight to the cart.
              </p>
            </div>

            <button
              type="button"
              aria-label="Close panel"
              onClick={onClose}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition hover:border-gray-300 hover:text-black"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 pb-5 pt-5 md:px-6 md:pb-6">
            <div className="grid gap-3 sm:grid-cols-[96px_minmax(0,1fr)]">
              <div className="overflow-hidden rounded-[24px] bg-[#f7f3ff]">
                <div className="relative aspect-[4/5] w-full">
                  {imageUrl ? (
                    <Image
                      {...getOptimizedImageProps(imageUrl, {
                        variant: "thumbnail",
                      })}
                      alt={item.title || "Poster"}
                      className="h-full w-full object-cover"
                      fill
                      sizes="(max-width: 767px) 120px, 96px"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-gray-400">
                      Poster
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-[24px] border border-secondary/10 bg-white/90 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-bold leading-snug text-blackhex">
                      {item.title || "Poster"}
                    </p>
                    <p className="mt-2 text-sm text-gray-600">{formatMeta(item)}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-secondary">
                      Qty {Number(item.quantity || 1)}
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="text-xl font-black tracking-[-0.04em] text-blackhex">
                      {currency}
                      {itemPrice.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              <button
                type="button"
                onClick={onProceedToCart}
                className="flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-bold uppercase tracking-[0.16em] text-white transition hover:bg-tertiary"
              >
                Proceed to the cart
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={onClose}
                className="h-12 rounded-full border border-secondary/15 bg-white px-5 text-sm font-bold uppercase tracking-[0.16em] text-blackhex transition hover:border-secondary/30 hover:bg-[#faf7ff]"
              >
                Continue shopping
              </button>
            </div>

            <div className="mt-5 rounded-[28px] border border-secondary/10 bg-[#fffdf5] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-secondary shadow-sm">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500">
                    Cart snapshot
                  </p>
                  <p className="mt-1 text-base font-semibold text-blackhex">
                    {cartCount} {cartCount === 1 ? "item" : "items"} in cart
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-end justify-between gap-3">
                <p className="text-sm text-gray-600">
                  Current subtotal before shipping and tax
                </p>
                <p className="text-lg font-black tracking-[-0.04em] text-blackhex">
                  {currency}
                  {Number(cartAmount || 0).toFixed(2)}
                </p>
              </div>
            </div>

            <section className="mt-5 rounded-[28px] border border-dashed border-secondary/20 bg-white/80 p-4 md:p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f6f1ff] text-secondary">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500">
                    Perfect add-ons
                  </p>
                  <h3 className="mt-1 text-lg font-bold text-blackhex">
                    Hanging extras coming soon
                  </h3>
                </div>
              </div>

              <div className="mt-4 rounded-[24px] border border-secondary/10 bg-[#fbf8ff] p-4">
                <p className="text-sm leading-6 text-gray-600">
                  This area is reserved for future add-ons like Command poster
                  strips and other clean hanging options.
                </p>
              </div>
            </section>
          </div>
        </div>
      </aside>
    </div>
  );
}
