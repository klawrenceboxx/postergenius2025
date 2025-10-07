"use client";
import { useState } from "react";
import { MoreVertical } from "lucide-react";
import { useAppContext } from "@/context/AppContext";

export default function ProductOverlay({ product }) {
  const { addToCart, removeFromWishlist } = useAppContext();
  const [open, setOpen] = useState(false);

  return (
    <div className="absolute top-3 right-3">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="flex items-center justify-center p-2 mr-2 bg-white/90 rounded-full shadow-md hover:scale-105 transition"
      >
        <MoreVertical className="h-5 w-5 text-gray-600" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-lg border border-gray-100 z-20">
          <button
            onClick={async (e) => {
              e.stopPropagation();
              await addToCart({
                productId: product._id?.toString(),
                title: product.title,
                imageUrl: product.imageUrl || product.image?.[0] || "",
                price:
                  product?.pricing?.defaultPhysicalFinalPrice ??
                  product?.pricing?.defaultDigitalFinalPrice ??
                  product?.price ??
                  0,
                quantity: 1,
                slug: product.slug,
                format: "physical",
                dimensions:
                  product?.defaultPhysicalDimensions ||
                  Object.keys(product?.physicalPricing || {})[0] ||
                  "18x24",
              });
              setOpen(false);
            }}
            className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm"
          >
            Add to cart
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeFromWishlist(product._id);
              setOpen(false);
            }}
            className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-red-500"
          >
            Remove from wishlist
          </button>
        </div>
      )}
    </div>
  );
}
