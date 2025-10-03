import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ShopClient from "@/components/ShopClient";

// ✅ force dynamic because we want live data
export const dynamic = "force-dynamic";

const fetchProducts = async () => {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/product/list`,
      {
        cache: "no-store",
      }
    );

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
      <ShopClient products={products} />
      <Footer />
    </>
  );
};

export default ShopPage;
