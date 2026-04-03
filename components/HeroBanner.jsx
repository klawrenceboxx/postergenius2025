import React from "react";
import Image from "next/image";
import Link from "next/link";
import { assets } from "@/assets/assets";
import { getOptimizedImageProps } from "@/lib/imageUtils";

const HeroBanner = () => {
  // React 19 hoists <link> elements from JSX to <head> automatically.
  // This explicitly preloads the hero image so the browser fetches it
  // as early as possible, regardless of JS hydration order.
  const heroSrc = assets.peacock_hero?.src ?? "";
  const q = 75;
  const base = `/_next/image?url=${encodeURIComponent(heroSrc)}&q=${q}`;
  const srcSet = [640, 828, 1080, 1200, 1920]
    .map((w) => `${base}&w=${w} ${w}w`)
    .join(", ");

  return (
    <>
      {heroSrc && (
        <link
          rel="preload"
          as="image"
          href={`${base}&w=828`}
          imageSrcSet={srcSet}
          imageSizes="100vw"
          fetchPriority="high"
        />
      )}
      <div className="flex relative w-full min-h-[480px] md:min-h-[560px] lg:min-h-[640px] items-center rounded-lg overflow-hidden mt-6">
        <Image
          {...getOptimizedImageProps(assets.peacock_hero)}
          alt="Peacock hero"
          fill
          priority
          fetchPriority="high"
          sizes="100vw"
          className="object-cover"
        />
        <div className="relative z-10 max-w-xl pl-6 md:pl-10 lg:pl-14">
          <h1 className="text-4xl md:text-[3.4rem] lg:text-[4rem] xl:text-[5rem] font-extrabold text-white drop-shadow-md leading-[0.95] tracking-tight">
            <span className="block">Discover Your</span>
            <span className="block">Perfect Poster</span>
            <span className="block">Collection Today</span>
          </h1>
          <p className="mt-4 max-w-md text-white/90 drop-shadow font-[500] text-base md:text-lg">
            Explore the latest posters and premium materials.
          </p>
          <Link
            href="/shop"
            className="inline-block mt-8 bg-tertiary hover:bg-secondary text-white px-10 py-4 rounded-full transition font-[700] text-sm md:text-base"
          >
            Shop Now
          </Link>
        </div>
      </div>
    </>
  );
};
export default HeroBanner;
