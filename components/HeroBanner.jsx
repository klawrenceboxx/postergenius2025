import React from "react";
import Image from "next/image";
import Link from "next/link";
import { assets } from "@/assets/assets";
import { getOptimizedImageProps } from "@/lib/imageUtils";
const HeroBanner = () => {
  return (
    <div className="flex relative w-full  min-h-[480px] md:min-h-[560px]  items-center rounded-lg overflow-hidden mt-6">
      <Image
        {...getOptimizedImageProps(assets.peacock_hero)}
        alt="Peacock hero"
        fill
        className="object-cover"
      />
      <div className="relative z-10 max-w-xl pl-6 md:pl-10">
        <h1 className="text-4xl md:text-5xl font-extrabold text-white drop-shadow-md leading-tight">
          Discover Your Perfect Poster Collection Today
        </h1>
        <p className="mt-4 text-white/90 drop-shadow font-[500]">
          Explore the latest posters and premium materials.
        </p>
        <Link
          href="/shop"
          className=" inline-block mt-8 bg-tertiary hover:bg-secondary text-white px-10 py-4 rounded-full transition font-[700]"
        >
          Shop Now
        </Link>
      </div>
    </div>
  );
};
export default HeroBanner;
