import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ShopClient from "@/components/ShopClient";
import connectDB from "@/config/db";
import Product from "@/models/Product";

export const dynamic = "force-dynamic";

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
      <ShopClient products={products} />
      <Footer />
    </>
  );
};

export default ShopPage;
