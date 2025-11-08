"use client";

import { assets } from "@/assets/assets";
import { useAppContext } from "@/context/AppContext";
import Image from "next/image";
import { useEffect } from "react";
import { getOptimizedImageProps } from "@/lib/imageUtils";

const OrderPlaced = () => {
  const { router, setCartItems, triggerCartRefresh } = useAppContext();

  useEffect(() => {
    setCartItems({});
    triggerCartRefresh();
    const timeout = setTimeout(() => {
      router.push("/my-orders");
    }, 5000);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="h-screen flex flex-col justify-center items-center gap-5">
      <div className="flex justify-center items-center relative">
        <Image
          {...getOptimizedImageProps(assets.checkmark)}
          className="absolute p-5"
          alt=""
        />
        <div className="animate-spin rounded-full h-24 w-24 border-4 border-t-green-300 border-gray-200"></div>
      </div>
      <div className="text-center text-2xl font-semibold">
        Order Placed Successfully
      </div>
    </div>
  );
};

export default OrderPlaced;
