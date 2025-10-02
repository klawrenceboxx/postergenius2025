import React, { Suspense } from "react";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import ShopClient from "@/components/ShopClient";

const fetchProducts = async () => {
  try {
    // ✅ relative API route works in all environments
    const response = await fetch("/api/product/list", {
      cache: "no-store",
      // Optionally revalidate every X seconds:
      // next: { revalidate: 60 },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch products");
    }

    const data = await response.json();
    return data?.success ? data.products : [];
  } catch (err) {
    console.error("fetchProducts error:", err);
    return [];
  }
};

const ShopPage = async () => {
  const products = await fetchProducts();

  return (
    <>
      <Navbar />
      <Suspense fallback={<div>Loading shop...</div>}>
        <ShopClient products={products} />
      </Suspense>
      <Footer />
    </>
  );
};

export default ShopPage;
