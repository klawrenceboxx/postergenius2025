"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import { Heart } from "lucide-react";
import { useAppContext } from "@/context/AppContext";

const ProductCard = ({ product }) => {
  const { currency, router, wishlist, addToWishlist, removeFromWishlist } =
    useAppContext();
  const [wishlistAnimation, setWishlistAnimation] = useState("");

  const productId = useMemo(() => {
    if (!product) return "";
    if (typeof product?._id === "object" && product?._id !== null) {
      return product._id.toString();
    }
    return (
      product?._id ?? product?.productId ?? product?.id ?? product?.slug ?? ""
    );
  }, [product]);

  const previewImage = useMemo(() => {
    if (!product) return "";
    if (Array.isArray(product.image) && product.image.length > 0) {
      return product.image[0];
    }
    if (Array.isArray(product.images) && product.images.length > 0) {
      return product.images[0];
    }
    return product.imageUrl || product.thumbnail || "";
  }, [product]);

  const displayPrice = useMemo(() => {
    const rawPrice =
      product?.pricing?.defaultPhysicalFinalPrice ??
      product?.pricing?.defaultDigitalFinalPrice ??
      product?.pricing?.defaultFinalPrice ??
      product?.offerPrice ??
      product?.finalPrice ??
      product?.price ??
      0;
    const numericPrice = Number(rawPrice);
    if (Number.isNaN(numericPrice)) return 0;
    return Math.max(numericPrice, 0);
  }, [product]);

  const isWishlisted = useMemo(() => {
    if (!productId) return false;

    return wishlist.some((entry) => {
      const entryProduct = entry?.product ?? entry;

      if (!entryProduct) return false;

      if (
        typeof entryProduct?._id === "object" &&
        entryProduct?._id !== null &&
        entryProduct._id.toString() === productId
      ) {
        return true;
      }

      const directId =
        entryProduct?._id ?? entryProduct?.productId ?? entryProduct?.id;

      return directId === productId;
    });
  }, [productId, wishlist]);

  const handleCardClick = () => {
    if (!productId) return;
    router.push(`/product/${productId}`);
    scrollTo(0, 0);
  };

  const toggleWishlist = (event) => {
    event?.preventDefault();
    event?.stopPropagation();

    if (!productId) return;

    const animationClass = isWishlisted
      ? "animate-wishlist-unpop"
      : "animate-wishlist-pop";
    setWishlistAnimation(animationClass);

    if (isWishlisted) {
      removeFromWishlist(productId);
    } else {
      addToWishlist(productId);
    }

    setTimeout(() => {
      setWishlistAnimation("");
    }, 220);
  };

  return (
    <div
      onClick={handleCardClick}
      className="flex w-full max-w-[250px] cursor-pointer flex-col items-start"
    >
      <div className="group relative flex h-80 w-full items-center justify-center overflow-hidden bg-gray-50 shadow-poster transition">
        {previewImage ? (
          <Image
            src={previewImage}
            alt={product?.name || product?.title || "Poster"}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            width={800}
            height={800}
            sizes="(max-width: 768px) 50vw, 25vw"
            priority={false}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-400">
            No image
          </div>
        )}

        <button
          type="button"
          aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          aria-pressed={isWishlisted}
          onClick={toggleWishlist}
          className="absolute top-3 right-3 flex cursor-pointer items-center justify-center rounded-full bg-white/90 p-2 text-gray-600 shadow-md transition-transform duration-200 hover:scale-110 hover:text-secondary active:scale-95"
        >
          <Heart
            className={`h-5 w-5 transition-colors duration-200 ${
              isWishlisted ? "text-pink-500" : "text-gray-600"
            } ${wishlistAnimation}`}
            fill={isWishlisted ? "currentColor" : "none"}
            strokeWidth={1.8}
          />
        </button>
      </div>

      {/* <div className="mt-4 flex w-full flex-col gap-2 text-left">
        <p className="truncate text-base font-semibold text-blackhex">
          {product?.name || product?.title || "Untitled Poster"}
        </p>
        <p className="line-clamp-2 text-sm text-gray-500">
          {product?.description || "Discover more details on the product page."}
        </p>
        <p className="text-sm font-semibold text-primary">
          {currency || "$"}
          {displayPrice.toFixed(2)}
        </p>
      </div> */}
    </div>
  );
};

export default ProductCard;
