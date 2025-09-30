import React, { Suspense } from "react";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import ShopClient from "@/components/ShopClient";

const resolveBaseUrl = () => {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
};

const fetchProducts = async () => {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const response = await fetch(`${baseUrl}/api/product/list`, {
    cache: "no-store",
  });
  const data = await response.json();
  return data?.success ? data.products : [];
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
