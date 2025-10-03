import React from "react";
import Link from "next/link";
import { assets } from "@/assets/assets";

const products = [
  {
    id: 1,
    image: assets.category_space,
    title: "8-bit & heroes",
    description: "Retro comic styles and pixel-perfect vigilantes.",
    posY: 10, // move visible crop downward (show more TOP of photo)
    category: "superheroes",
  },
  {
    id: 2,
    image: assets.category_peacock,
    title: "Nature Elegance",
    description: "Wildlife captured in vibrant detail.",
    posY: 40, // closer to center
    category: "animals",
  },
  {
    id: 3,
    image: assets.category_vintage,
    title: "Timeless Vintage",
    description: "Classic posters with retro charm.",
    posY: 10, // show more BOTTOM of photo
    category: "vintage",
  },
];

// Consistent card heights (small → larger)
const cardHeights = "h-48 sm:h-56 md:h-64 lg:h-96";
const barHeights = "h-24 sm:h-28 md:h-32";

// Support string paths or imported images (StaticImport)
const toUrl = (img) => (typeof img === "string" ? img : img?.src ?? "");

const clamp2 = {
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

const FeaturedCategory = () => {
  return (
    <div className="mt-14">
      {/* title: Featured Categories */}
      <div className="flex flex-col items-center">
        <p className="text-3xl font-medium">Featured Categories</p>
        <div className="w-28 h-0.5 bg-primary mt-2"></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-8 mt-12 md:px-14 px-4">
        {products.map(({ id, image, title, description, posY, category }) => {
          const href = category
            ? `/shop?category=${encodeURIComponent(category)}`
            : "/shop";

          return (
            <Link
              key={id}
              href={href}
              className={`group relative w-full ${cardHeights} overflow-hidden rounded-xl border`}
            >
              {/* Background image layer with per-card vertical offset */}
              <div
                className="absolute inset-0 bg-cover"
                style={{
                  backgroundImage: `url(${toUrl(image)})`,
                  backgroundPosition: `center ${posY ?? 50}%`,
                }}
              />

              {/* Optional subtle darken on hover */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors"></div>

              {/* Fixed-height bottom bar (stays pinned; no gap on hover) */}
              <div
                className={`absolute inset-x-0 bottom-0 ${barHeights} bg-black/60 group-hover:bg-black/70 text-white transition-colors overflow-hidden`}
              >
                {/* Only inner content moves slightly; bar remains flush to bottom */}
                <div className="p-4 pt-6 transform transition-transform duration-300 group-hover:-translate-y-1">
                  <p
                    className="font-semibold text-lg sm:text-xl lg:text-xl"
                    style={clamp2}
                  >
                    {title}
                  </p>

                  <p
                    className="mt-1 text-xs sm:text-sm lg:text-base leading-5 opacity-90"
                    style={clamp2}
                  >
                    {description}
                  </p>
                  {/* (Optional) CTA — add back your icon if you want */}
                  {/* <button className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-orange-600 px-3 py-2 text-xs sm:text-sm font-medium hover:bg-orange-500"> */}
                  {/*   Buy now */}
                  {/* </button> */}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default FeaturedCategory;
