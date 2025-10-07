"use client";

import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useAppContext } from "@/context/AppContext";
import { Heart } from "lucide-react";

const resolveProductId = (product) => {
  if (!product) return "";
  if (typeof product?._id === "object" && product?._id !== null) {
    return product._id.toString();
  }
  return product?._id ?? product?.productId ?? product?.id ?? "";
};

const resolvePrice = (product) => {
  const value =
    product?.pricing?.defaultPhysicalFinalPrice ??
    product?.pricing?.defaultDigitalFinalPrice ??
    product?.pricing?.defaultFinalPrice ??
    product?.offerPrice ??
    product?.finalPrice ??
    product?.price ??
    0;

  const parsed = Number(value);
  if (Number.isNaN(parsed)) return 0;
  return Math.max(parsed, 0);
};

const resolveImage = (product) => {
  if (!product) return "";
  if (Array.isArray(product.image) && product.image.length > 0) {
    return product.image[0];
  }
  if (Array.isArray(product.images) && product.images.length > 0) {
    return product.images[0];
  }
  return product.imageUrl || product.thumbnail || "";
};

const WishlistPage = () => {
  const { wishlist, currency, removeFromWishlist, router } = useAppContext();

  const wishlistProducts = (wishlist || [])
    .map((entry) => entry?.product ?? entry)
    .filter((product) => resolveProductId(product));

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
                <Heart className="h-8 w-8" fill="currentColor" strokeWidth={1.6} />
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
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {wishlistProducts.map((product) => {
                const id = resolveProductId(product);
                const price = resolvePrice(product);
                const image = resolveImage(product);

                return (
                  <article
                    key={id}
                    className="group flex flex-col overflow-hidden rounded-3xl bg-white shadow-md transition hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div className="relative aspect-[4/5] w-full overflow-hidden bg-gray-50">
                      {image ? (
                        <Image
                          src={image}
                          alt={product?.name || product?.title || "Wishlist item"}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gray-100 text-sm text-gray-400">
                          Image coming soon
                        </div>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col gap-4 p-6">
                      <div className="flex flex-col gap-2">
                        <h3 className="text-lg font-semibold text-blackhex">
                          {product?.name || product?.title || "Untitled Poster"}
                        </h3>
                        <p className="text-sm text-gray-500 line-clamp-2">
                          {product?.description ||
                            "Open the product details to explore formats, dimensions, and more."}
                        </p>
                      </div>

                      <p className="text-base font-semibold text-primary">
                        {(currency || "$")}
                        {price.toFixed(2)}
                      </p>

                      <div className="mt-auto flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => router.push(`/product/${id}`)}
                          className="flex-1 rounded-full border border-primary px-4 py-2 text-sm font-medium text-primary transition-transform duration-200 hover:scale-[1.02] hover:bg-primary/5 active:scale-95"
                        >
                          View details
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFromWishlist(id)}
                          className="flex-1 rounded-full bg-gradient-to-r from-pink-500 to-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform duration-200 hover:scale-[1.02] active:scale-95"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </>
  );
};

export default WishlistPage;
