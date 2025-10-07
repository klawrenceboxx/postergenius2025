"use client";

import { fbq } from "@/lib/metaPixel";

// Example component showing how to trigger a custom Facebook Pixel event.
export function MetaPixelEventExample() {
  const handlePurchase = () => {
    // Track a purchase event with custom value and currency metadata.
    fbq("track", "Purchase", { value: 50, currency: "CAD" });
  };

  return (
    <button
      type="button"
      className="rounded-md bg-black px-4 py-2 text-white"
      onClick={handlePurchase}
    >
      Trigger Purchase Event
    </button>
  );
}
