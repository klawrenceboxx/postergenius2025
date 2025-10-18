"use client";

import { assets } from "@/assets/assets";
import { useAppContext } from "@/context/AppContext";
import Image from "next/image";
import { useEffect } from "react";

export const metadata = {
  title: "Order Placed | PosterGenius",
  description:
    "Your PosterGenius order was placed successfully. Sit tight while we prepare your posters and confirmation email.",
  alternates: { canonical: "https://postergenius.ca/order-placed" },
  openGraph: {
    title: "Order Placed | PosterGenius",
    description:
      "Your PosterGenius order was placed successfully. Sit tight while we prepare your posters and confirmation email.",
    url: "https://postergenius.ca/order-placed",
    siteName: "PosterGenius",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Order Placed | PosterGenius",
    description:
      "Your PosterGenius order was placed successfully. Sit tight while we prepare your posters and confirmation email.",
  },
};

const OrderPlaced = () => {
  const { router } = useAppContext();

  useEffect(() => {
    const timeout = setTimeout(() => {
      router.push("/my-orders");
    }, 5000);

    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <div className="h-screen flex flex-col justify-center items-center gap-5">
      <h1 className="sr-only">Order Placed | PosterGenius</h1>
      <div className="flex justify-center items-center relative">
        <Image className="absolute p-5" src={assets.checkmark} alt="" />
        <div className="animate-spin rounded-full h-24 w-24 border-4 border-t-green-300 border-gray-200"></div>
      </div>
      <div className="text-center text-2xl font-semibold">
        Order Placed Successfully
      </div>
    </div>
  );
};

export default OrderPlaced;
