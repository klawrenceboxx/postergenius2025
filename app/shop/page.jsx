import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ShopClient from "@/components/ShopClient";
import connectDB from "@/config/db";
import Product from "@/models/Product";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Shop | PosterGenius",
  description:
    "Browse PosterGenius posters, fine art prints, and decor with dynamic filters for every fandom and room.",
  alternates: { canonical: "https://postergenius.ca/shop" },
  openGraph: {
    title: "Shop | PosterGenius",
    description:
      "Browse PosterGenius posters, fine art prints, and decor with dynamic filters for every fandom and room.",
    url: "https://postergenius.ca/shop",
    siteName: "PosterGenius",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Shop | PosterGenius",
    description:
      "Browse PosterGenius posters, fine art prints, and decor with dynamic filters for every fandom and room.",
  },
};

const getProducts = async () => {
  try {
    await connectDB();

    const products = await Product.find({})
      .sort({ date: -1 })
      .lean();

    return products.map((product) => ({
      ...product,
      _id: product._id?.toString?.() ?? "",
      userId:
        typeof product.userId === "object" && product.userId !== null
          ? product.userId.toString()
          : product.userId ?? "",
      date:
        product.date instanceof Date
          ? product.date.toISOString()
          : product.date ?? null,
    }));
  } catch (error) {
    console.error("getProducts error:", error);
    return [];
  }
};

const ShopPage = async () => {
  const products = await getProducts();

  return (
    <>
      <Navbar />
      <h1 className="sr-only">Shop | PosterGenius</h1>
      <ShopClient products={products} />
      <Footer />
    </>
  );
};

export default ShopPage;
