"use client";

import React from "react";
import { assets } from "@/assets/assets";
import OrderSummary from "@/components/OrderSummary";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import { useAppContext } from "@/context/AppContext";
import { getOptimizedImageProps } from "@/lib/imageUtils";

const Cart = () => {
  const {
    products,
    router,
    cartItems,
    updateCartQuantity,
    getCartCount,
    shippingQuote,
  } =
    useAppContext();

  return (
    <>
      <Navbar />
      <div className="flex flex-col md:flex-row gap-10 px-6 md:px-16 lg:px-32 pt-14 mb-20">
        <div className="flex-1">
          {/* Header */}
          <div className="flex items-center justify-between mb-8 border-b border-gray-300 pb-6">
            <p className="text-2xl md:text-3xl text-blackhex">
              Your <span className="font-semibold text-primary">Cart</span>
            </p>
            <p className="text-lg md:text-xl text-gray-500">
              {getCartCount()} Items
            </p>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead className="text-left border-b border-gray-200">
                <tr>
                  <th className="pb-4 md:px-4 px-1 text-blackhex font-medium">
                    Product Details
                  </th>
                  <th className="pb-4 md:px-4 px-1 text-blackhex font-medium">
                    Price
                  </th>
                  <th className="pb-4 md:px-4 px-1 text-blackhex font-medium">
                    Quantity
                  </th>
                  <th className="pb-4 md:px-4 px-1 text-blackhex font-medium">
                    Subtotal
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(cartItems).map(([key, entry]) => {
                  const isObj = entry && typeof entry === "object";
                  const productId = isObj ? entry.productId : key;
                  const product = products.find((p) => p._id === productId);
                  if (!product) return null;

                  const quantity = isObj ? entry.quantity : entry;
                  if (!quantity || quantity <= 0) return null;

                  const unitPrice = isObj
                    ? Number(entry.price || 0)
                    : Number(
                        product?.pricing?.defaultPhysicalFinalPrice ??
                          product.finalPrice ??
                          product.price ??
                          0
                      );
                  const title = isObj ? entry.title : product.name;
                  const imageUrl = isObj ? entry.imageUrl : product.image?.[0];
                  const format = isObj ? entry.format : undefined;
                  const dims = isObj ? entry.dimensions : undefined;

                  return (
                    <tr
                      key={key}
                      className="border-b border-gray-100 hover:bg-gray-50/50 transition"
                    >
                      {/* Product */}
                      <td className="flex items-center gap-4 py-4 md:px-4 px-1">
                        <div>
                          <div className="rounded-lg overflow-hidden bg-gray-100 p-2 shadow-sm">
                            <Image
                              {...getOptimizedImageProps(imageUrl, { variant: "thumbnail" })}
                              alt={title}
                              className="w-16 h-auto object-cover"
                              width={1280}
                              height={720}
                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            />
                          </div>
                          <button
                            className="md:hidden text-xs text-primary mt-1 hover:underline"
                            onClick={() => updateCartQuantity(key, 0)}
                          >
                            Remove
                          </button>
                        </div>
                        <div className="text-sm hidden md:block">
                          <p className="text-blackhex">{title}</p>
                          {isObj && (
                            <p className="text-xs text-gray-500">
                              {format}
                              {dims && dims !== "digital" ? ` • ${dims}` : ""}
                            </p>
                          )}
                          <button
                            className="text-xs text-primary mt-1 hover:underline"
                            onClick={() => updateCartQuantity(key, 0)}
                          >
                            Remove
                          </button>
                        </div>
                      </td>

                      {/* Price */}
                      <td className="py-4 md:px-4 px-1 text-gray-700">
                        ${unitPrice.toFixed(2)}
                      </td>

                      {/* Quantity controls */}
                      <td className="py-4 md:px-4 px-1">
                        <div className="flex items-center md:gap-2 gap-1">
                          <button
                            onClick={() =>
                              updateCartQuantity(key, quantity - 1)
                            }
                            className="p-1 rounded-full hover:bg-secondary/20 transition"
                          >
                            <Image
                              {...getOptimizedImageProps(assets.decrease_arrow)}
                              alt="decrease_arrow"
                              className="w-4 h-4"
                            />
                          </button>
                          <input
                            onChange={(e) =>
                              updateCartQuantity(key, Number(e.target.value))
                            }
                            type="number"
                            value={quantity}
                            className="w-10 border border-gray-300 text-center rounded-md text-blackhex"
                          />
                          <button
                            onClick={() =>
                              updateCartQuantity(key, quantity + 1)
                            }
                            className="p-1 rounded-full hover:bg-secondary/20 transition"
                          >
                            <Image
                              {...getOptimizedImageProps(assets.increase_arrow)}
                              alt="increase_arrow"
                              className="w-4 h-4"
                            />
                          </button>
                        </div>
                      </td>

                      {/* Subtotal */}
                      <td className="py-4 md:px-4 px-1 text-gray-700">
                        ${(unitPrice * quantity).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Continue shopping */}
          <button
            onClick={() => router.push("/shop")}
            className="group flex items-center mt-6 gap-2 text-primary hover:text-tertiary transition-colors"
          >
            <Image
              {...getOptimizedImageProps(assets.arrow_right_icon_colored)}
              className="group-hover:-translate-x-1 transition-transform"
              alt="arrow_right_icon_colored"
            />
            Continue Shopping
          </button>
        </div>

        {/* Order summary (right-hand panel) */}
        <OrderSummary shippingQuote={shippingQuote} />
      </div>
    </>
  );
};

export default Cart;
