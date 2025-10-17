"use client";
import React, { useCallback, useEffect, useState } from "react";
import { assets } from "@/assets/assets";
import Image from "next/image";
import { useAppContext } from "@/context/AppContext";
import Footer from "@/components/seller/Footer";
import Loading from "@/components/Loading";
import axios from "axios";
import toast from "react-hot-toast";
import { getOptimizedImageProps } from "@/lib/imageUtils";

const ProductList = () => {
  const { router, getToken, user } = useAppContext();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const fetchSellerProduct = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getToken();

      const { data } = await axios.get("/api/product/seller-list", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
        setProducts(data.products);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (user) {
      fetchSellerProduct();
    }
  }, [user, fetchSellerProduct]);

  const handleDelete = async (productId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this product?"
    );

    if (!confirmed) return;

    try {
      setDeletingId(productId);
      const token = await getToken();
      const { data } = await axios.delete(`/api/product/${productId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
        toast.success("Product deleted");
        setProducts((prev) => prev.filter((item) => item._id !== productId));
      } else {
        toast.error(data.message || "Failed to delete product");
      }
    } catch (error) {
      toast.error(error.message || "Failed to delete product");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex-1 min-h-screen flex flex-col justify-between">
      {loading ? (
        <Loading />
      ) : (
        <div className="w-full md:p-10 p-4">
          <h2 className="pb-4 text-lg font-medium">All Product</h2>
          <div className="flex flex-col items-center max-w-4xl w-full overflow-hidden rounded-md bg-white border border-gray-500/20">
            <table className=" table-fixed w-full overflow-hidden">
              <thead className="text-gray-900 text-sm text-left">
                <tr>
                  <th className="w-2/3 md:w-2/5 px-4 py-3 font-medium truncate">
                    Product
                  </th>
                  <th className="px-4 py-3 font-medium truncate max-sm:hidden">
                    Category
                  </th>
                  <th className="px-4 py-3 font-medium truncate">Price</th>
                  <th className="px-4 py-3 font-medium truncate max-sm:hidden">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="text-sm text-gray-500">
                {products.map((product, index) => {
                  const primaryImage =
                    Array.isArray(product.image) && product.image.length > 0
                      ? product.image[0]
                      : assets.upload_area;
                  const pricing = product.pricing || {};
                  const basePrice = Number(
                    pricing.defaultPhysicalBasePrice ?? product.price ?? 0
                  );
                  const finalPrice = Number(
                    pricing.defaultPhysicalFinalPrice ?? product.finalPrice ?? basePrice
                  );
                  const hasValidPrice = Number.isFinite(finalPrice) && finalPrice > 0;
                  const showDiscount =
                    Number.isFinite(basePrice) &&
                    basePrice > 0 &&
                    Math.abs(basePrice - finalPrice) > 0.009;

                  return (
                    <tr key={index} className="border-t border-gray-500/20">
                      <td className="md:px-4 pl-2 md:pl-4 py-3 flex items-center space-x-3 truncate">
                        <div className="bg-gray-500/10 rounded p-2">
                          <Image
                            {...getOptimizedImageProps(primaryImage, { variant: "thumbnail" })}
                            alt="product Image"
                            className="w-16"
                            width={1280}
                            height={720}
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          />
                        </div>
                        <span className="truncate w-full">{product.name}</span>
                      </td>
                      <td className="px-4 py-3 max-sm:hidden">
                        {product.category}
                      </td>
                      <td className="px-4 py-3">
                        {hasValidPrice ? (
                          <div className="flex flex-col">
                            <span>${finalPrice.toFixed(2)}</span>
                            {showDiscount && (
                              <span className="text-xs text-gray-500 line-through">
                                ${basePrice.toFixed(2)}
                              </span>
                            )}
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-3 max-sm:hidden">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              router.push(`/seller/edit-product/${product._id}`)
                            }
                            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(product._id)}
                            disabled={deletingId === product._id}
                            className="px-3 py-2 border border-red-300 text-red-600 rounded-md text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {deletingId === product._id ? "Deleting..." : "Delete"}
                          </button>
                          <button
                            onClick={() => router.push(`/product/${product._id}`)}
                            className="flex items-center gap-1 px-1.5 md:px-3.5 py-2 bg-orange-600 text-white rounded-md"
                          >
                            <span className="hidden md:block">Visit</span>
                            <Image
                              {...getOptimizedImageProps(assets.redirect_icon)}
                              className="h-3.5"
                              alt="redirect_icon"
                            />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <Footer />
    </div>
  );
};

export default ProductList;
