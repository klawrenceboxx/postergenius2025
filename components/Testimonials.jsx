import React from "react";
import Image from "next/image";
import { getOptimizedImageProps } from "@/lib/imageUtils";

// Replace these with your real paths (the 3 photos you sent: dining peacocks, yellow peacock, lion canvas)
const images = [
  "/images/testimonials/testimonial_lion.jpg", // image 3
  "/images/testimonials/testimonial_peacock_mail.png", // image 1
  "/images/testimonials/testimonial_peacock.jpeg", // image 2
  "/images/testimonials/testimonial_y_peacock.jpeg", // image 4
  // Add more file paths here to fill out the mosaic...
];

const reviews = [
  {
    name: "Maya L.",
    quote:
      "The print quality was better than I expected, and the colors looked incredible in my office.",
  },
  {
    name: "Jordan R.",
    quote:
      "Shipping was quick, the poster arrived in perfect shape, and the framing options felt premium.",
  },
  {
    name: "Taylor S.",
    quote:
      "I ordered a wildlife piece for my living room and it completely changed the space.",
  },
];

export default function CommunityMasonry({
  title = "Get inspired by our Community",
  showHeader = true,
  className = "",
}) {
  return (
    <section className={className || "py-14 md:py-40"}>
      {showHeader ? (
        <div className="flex flex-col items-center">
          <p className="text-3xl font-[400]]">{title}</p>
          <div className="w-28 h-0.5 bg-primary mt-2"></div>
        </div>
      ) : null}

      {/* Masonry container */}
      <div className="mt-8 md:mt-12 px-4 md:px-14">
        {/* columns-* creates the masonry effect; gap-x handled by column-gap via gap- */}
        <div className="columns-1 sm:columns-2 lg:columns-4 gap-4 [column-fill:_balance]">
          {images.map((src, i) => (
            <figure key={i} className="mb-4 break-inside-avoid">
              <Image
                {...getOptimizedImageProps(src, { variant: "detail" })}
                alt={`Community spotlight ${i + 1}`}
                width={800}
                height={1000}
                className="w-full h-auto rounded-xl object-cover shadow-sm"
                sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 25vw"
              />
            </figure>
          ))}
        </div>
      </div>

      <div className="mt-12 md:mt-16 px-4 md:px-14">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {reviews.map((review) => (
            <article
              key={review.name}
              className="rounded-2xl border border-black/10 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.06)]"
            >
              <div className="flex items-center justify-between gap-4">
                <p className="text-lg font-semibold text-slate-900">
                  {review.name}
                </p>
                <p
                  className="text-amber-500 tracking-[0.2em] text-sm"
                  aria-label="Five star review"
                >
                  {"★★★★★"}
                </p>
              </div>
              <p className="mt-4 text-sm md:text-base leading-7 text-slate-600">
                {review.quote}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
