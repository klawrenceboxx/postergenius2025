"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import ProductCard from "@/components/ProductCard";
import { Heart } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import ProductOverlay from "@/components/ProductOverlay";

const WishlistPage = () => {
  const { products, router, addToCart, removeFromWishlist } = useAppContext();
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch wishlist (productId array) from backend
  useEffect(() => {
    const fetchWishlist = async () => {
      try {
        const res = await fetch("/api/wishlist/get");
        const data = await res.json();
        if (data.success) {
          setWishlist(data.wishlist || []); // [{ productId }]
        }
      } catch (err) {
        console.error("Failed to load wishlist:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchWishlist();
  }, []);

  // Match each wishlist productId to product details
  const wishlistProducts = useMemo(() => {
    if (!Array.isArray(wishlist) || wishlist.length === 0) return [];
    return wishlist
      .map((item) => products.find((p) => p._id === item.productId))
      .filter(Boolean);
  }, [wishlist, products]);

  // 🆕 Re-fetch wishlist whenever an item is removed (like heart icon behavior)
  useEffect(() => {
    const refreshWishlist = async () => {
      try {
        const res = await fetch("/api/wishlist/get");
        const data = await res.json();
        if (data.success) setWishlist(data.wishlist || []);
      } catch (err) {
        console.error("Failed to refresh wishlist:", err);
      }
    };
    refreshWishlist();
  }, [removeFromWishlist]);
  // 🆕 END re-fetch logic

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
              Your <span className="text-primary">Wishlist</span>
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
                  {/* 🆕 Wishlist-only overlay (e.g., 3-dot menu) goes here later */}
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
