"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import ProductCard from "@/components/ProductCard";
import { Heart } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import ProductOverlay from "@/components/ProductOverlay";
import { useClerk, useUser } from "@clerk/nextjs";
import toast from "react-hot-toast";

export const metadata = {
  title: "Wishlist | PosterGenius",
  description:
    "Save your favorite PosterGenius art prints to a wishlist so you can revisit and purchase them anytime.",
  alternates: { canonical: "https://postergenius.ca/wishlist" },
  openGraph: {
    title: "Wishlist | PosterGenius",
    description:
      "Save your favorite PosterGenius art prints to a wishlist so you can revisit and purchase them anytime.",
    url: "https://postergenius.ca/wishlist",
    siteName: "PosterGenius",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Wishlist | PosterGenius",
    description:
      "Save your favorite PosterGenius art prints to a wishlist so you can revisit and purchase them anytime.",
  },
};

const WishlistPage = () => {
  const { products, wishlist, fetchWishlist } = useAppContext();
  const { openSignIn } = useClerk();
  const { isLoaded, isSignedIn } = useUser();

  const [loading, setLoading] = useState(true);
  const [hasPromptedGuest, setHasPromptedGuest] = useState(false);

  useEffect(() => {
    let isActive = true;

    if (!isLoaded) {
      return () => {
        isActive = false;
      };
    }

    if (!isSignedIn) {
      if (!hasPromptedGuest) {
        toast.error("Please sign in to save your wishlist.");
        openSignIn?.();
        setHasPromptedGuest(true);
      }
      setLoading(false);

      return () => {
        isActive = false;
      };
    }

    const loadWishlist = async () => {
      try {
        setLoading(true);
        await fetchWishlist();
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadWishlist();
    setHasPromptedGuest(false);

    return () => {
      isActive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn]);

  const wishlistProducts = useMemo(() => {
    const normalizedWishlist = Array.isArray(wishlist) ? wishlist : [];

    const matchProductById = (productId) => {
      if (!productId) return null;

      return (
        products.find((productItem) => {
          const resolvedId =
            typeof productItem?._id === "object" && productItem?._id !== null
              ? productItem._id.toString()
              : productItem?._id ??
                productItem?.productId ??
                productItem?.id ??
                productItem?.slug ??
                "";

          return resolvedId === productId;
        }) ?? null
      );
    };

    return normalizedWishlist
      .map((entry) => {
        const entryProduct = entry?.product ?? entry;
        if (!entryProduct) {
          return null;
        }

        if (entryProduct?.name || entryProduct?.title) {
          return entryProduct;
        }

        let entryProductId = "";
        if (
          typeof entryProduct?._id === "object" &&
          entryProduct?._id !== null &&
          typeof entryProduct?._id.toString === "function"
        ) {
          entryProductId = entryProduct._id.toString();
        } else {
          entryProductId =
            entryProduct?.productId ??
            entryProduct?._id ??
            entryProduct?.id ??
            "";
        }

        return matchProductById(entryProductId);
      })
      .filter(Boolean);
  }, [wishlist, products]);

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="flex h-screen items-center justify-center text-gray-500">
          Loading wishlist...
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="px-6 pb-20 pt-16 md:px-16 lg:px-32">
        <section className="mx-auto flex w-full max-w-6xl flex-col gap-12">
          <header className="flex flex-col gap-2 border-b border-gray-200 pb-6">
            <h1 className="text-3xl font-semibold text-blackhex md:text-4xl">
              Wishlist <span className="text-primary">| PosterGenius</span>
            </h1>
            <p className="text-sm text-gray-500 md:text-base">
              Save posters you love and revisit them anytime. Move your
              favourites to the cart when you&apos;re ready to make them yours.
            </p>
          </header>

          {wishlistProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-6 rounded-3xl bg-white py-16 text-center shadow-md">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-pink-100 text-pink-500">
                <Heart
                  className="h-8 w-8"
                  fill="currentColor"
                  strokeWidth={1.6}
                />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-blackhex">
                  Your wishlist is empty 💔
                </h2>
                <p className="text-gray-500">
                  Browse our collection and tap the heart icon to keep track of
                  your must-have posters.
                </p>
              </div>
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition-transform duration-200 hover:scale-105 active:scale-95"
              >
                Discover posters
              </Link>
            </div>
          ) : (
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {wishlistProducts.map((product) => (
                <div key={product._id} className="relative group">
                  <ProductCard product={product} />
                  <ProductOverlay product={product} />
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
};

export default WishlistPage;
