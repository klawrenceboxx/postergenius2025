import React from "react";
import { assets } from "@/assets/assets";
import Image from "next/image";
import { getOptimizedImageProps } from "@/lib/imageUtils";

const Banner = () => {
  return (
    <div className="flex flex-col md:flex-row items-center justify-between md:pl-20 py-14 md:py-0 bg-[#E6E9F2] my-16 rounded-xl overflow-hidden">
      <Image
        {...getOptimizedImageProps(assets.jbl_soundbox_image)}
        className="max-w-56"
        alt="jbl_soundbox_image"
      />
      <div className="flex flex-col items-center justify-center text-center space-y-2 px-4 md:px-0">
        <h2 className="text-2xl md:text-3xl font-semibold max-w-[290px]">
          Level Up Your Gaming Experience
        </h2>
        <p className="max-w-[343px] font-medium text-gray-800/60">
          From immersive sound to precise controls—everything you need to win
        </p>
        <button className="group flex items-center justify-center gap-1 px-12 py-2.5 bg-orange-600 rounded text-white">
          Buy now
          <Image
            {...getOptimizedImageProps(assets.arrow_icon_white)}
            className="group-hover:translate-x-1 transition"
            alt="arrow_icon_white"
          />
        </button>
      </div>
      <Image
        {...getOptimizedImageProps(assets.md_controller_image)}
        className="hidden md:block max-w-80"
        alt="md_controller_image"
      />
      <Image
        {...getOptimizedImageProps(assets.sm_controller_image)}
        className="md:hidden"
        alt="sm_controller_image"
      />
    </div>
  );
};

export default Banner;