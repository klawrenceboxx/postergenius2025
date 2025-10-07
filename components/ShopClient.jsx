"use client";

import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Fuse from "fuse.js";
import ProductCard from "@/components/ProductCard";
import SearchBar from "./SearchBar";
import { CATEGORIES } from "@/src/constants/categories";

const SORT_OPTIONS = [
  { label: "Featured", value: "featured" },
  { label: "Price: Low to High", value: "price-asc" },
  { label: "Price: High to Low", value: "price-desc" },
];

const getComparablePrice = (product) => {
  const pricing = product?.pricing;
  if (pricing) {
    const value = Number(pricing.defaultPhysicalFinalPrice ?? 0);
    if (!Number.isNaN(value) && value > 0) return value;
  }
  const fallback = Number(product?.finalPrice ?? product?.price ?? 0);
  return Number.isNaN(fallback) ? 0 : fallback;
};

const normalizeProducts = (products) =>
  Array.isArray(products)
    ? products.filter(
        (product) =>
          product && typeof product === "object" && product.image?.length
      )
    : [];

const ShopClient = ({ products }) => {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("search") || "";
  const [searchTerm, setSearchTerm] = useState(initialQuery);

  const getInitialCategory = () => {
    const categoryParam = searchParams.get("category");
    return categoryParam && CATEGORIES.includes(categoryParam)
      ? categoryParam
      : "all";
  };

  const [activeCategory, setActiveCategory] = useState(getInitialCategory);
  const [sortOrder, setSortOrder] = useState(SORT_OPTIONS[0].value);

  // keep searchTerm synced with query string (if URL changes)
  useEffect(() => {
    setSearchTerm(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    const categoryParam = searchParams.get("category");

    if (categoryParam && CATEGORIES.includes(categoryParam)) {
      setActiveCategory(categoryParam);
      return;
    }

    if (
      !categoryParam ||
      (categoryParam && !CATEGORIES.includes(categoryParam))
    ) {
      setActiveCategory("all");
    }
  }, [searchParams]);

  const normalizedProducts = useMemo(
    () => normalizeProducts(products),
    [products]
  );

  const fuse = useMemo(() => {
    const options = {
      keys: [
        { name: "name", weight: 0.5 },
        { name: "description", weight: 0.3 },
        { name: "category", weight: 0.2 },
      ],
      threshold: 0.35,
      ignoreLocation: true,
    };

    return new Fuse(normalizedProducts, options);
  }, [normalizedProducts]);

  const categoryCounts = useMemo(() => {
    const counts = new Map();
    for (const category of CATEGORIES) {
      counts.set(category, 0);
    }

    for (const product of normalizedProducts) {
      if (product?.category && counts.has(product.category)) {
        counts.set(product.category, (counts.get(product.category) ?? 0) + 1);
      }
    }

    return counts;
  }, [normalizedProducts]);

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim();
    const searchResults = term
      ? fuse.search(term).map((result) => result.item)
      : normalizedProducts;

    const matchesCategory = (product) => {
      if (activeCategory === "all") return true;
      return product.category === activeCategory;
    };

    const sortedProducts = searchResults
      .filter((product) => matchesCategory(product))
      .map((product) => ({ ...product }));

    if (sortOrder === "price-asc" || sortOrder === "price-desc") {
      const direction = sortOrder === "price-asc" ? 1 : -1;
      sortedProducts.sort((a, b) => {
        const priceA = getComparablePrice(a);
        const priceB = getComparablePrice(b);
        return (priceA - priceB) * direction;
      });
    }

    return sortedProducts;
  }, [activeCategory, fuse, normalizedProducts, searchTerm, sortOrder]);

  return (
    <main className="px-6 md:px-10 lg:px-16 xl:px-24 py-12">
      <div className="flex flex-col gap-10 lg:flex-row">
        <aside className="lg:w-64 flex-shrink-0">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Categories
              </h2>
              <button
                type="button"
                onClick={() => setActiveCategory("all")}
                className="text-sm font-medium text-primary hover:text-orange-700"
              >
                Reset
              </button>
            </div>
            <ul className="mt-6 space-y-2 text-sm text-gray-600">
              <li>
                <button
                  type="button"
                  onClick={() => setActiveCategory("all")}
                  className={`flex w-full items-center justify-between rounded-xl px-4 py-2 transition ${
                    activeCategory === "all"
                      ? "bg-orange-50 text-orange-600"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <span>All products</span>
                  <span className="text-xs font-medium text-gray-500">
                    {normalizedProducts.length}
                  </span>
                </button>
              </li>
              {CATEGORIES.map((category) => (
                <li key={category}>
                  <button
                    type="button"
                    onClick={() => setActiveCategory(category)}
                    className={`flex w-full items-center justify-between rounded-xl px-4 py-2 transition ${
                      activeCategory === category
                        ? "bg-orange-50 text-orange-600"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <span>{category}</span>
                    <span className="text-xs font-medium text-gray-500">
                      {categoryCounts.get(category) ?? 0}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <section className="flex-1 space-y-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900">Shop</h1>
              <p className="mt-1 text-sm text-gray-500">
                Showing {filteredProducts.length} of {normalizedProducts.length}{" "}
                products
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <SearchBar
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Products, categories..."
              />
              <label className="flex items-center gap-3 rounded-full border border-gray-200 bg-white px-4 py-2 shadow-sm">
                <span className="text-sm text-gray-500">Sort by</span>
                <select
                  value={sortOrder}
                  onChange={(event) => setSortOrder(event.target.value)}
                  className="bg-transparent text-sm font-medium outline-none"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 2xl:gap-8">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product?._id ?? product?.productId}
                  product={product}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-gray-300 bg-white/80 p-12 text-center text-gray-500">
              <h2 className="text-xl font-semibold text-gray-800">
                No products found
              </h2>
              <p className="mt-2 text-sm">
                Try clearing your filters or searching for a different item.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setActiveCategory("all");
                  setSortOrder(SORT_OPTIONS[0].value);
                }}
                className="mt-6 inline-flex items-center rounded-full bg-orange-500 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600"
              >
                Reset filters
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
};

export default ShopClient;
