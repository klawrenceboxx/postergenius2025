import React from "react";

// Replace these with your real paths (the 3 photos you sent: dining peacocks, yellow peacock, lion canvas)
const images = [
  "/images/testimonials/testimonial_lion.jpg", // image 3
  "/images/testimonials/testimonial_peacock_mail.png", // image 1
  "/images/testimonials/testimonial_peacock.jpeg", // image 2
  "/images/testimonials/testimonial_y_peacock.jpeg", // image 4
  // Add more file paths here to fill out the mosaic...
];

export default function CommunityMasonry() {
  return (
    <section className="py-14 md:py-40">
      <div className="flex flex-col items-center">
        <p className="text-3xl font-[400]]">Get inspired by our Community</p>
        <div className="w-28 h-0.5 bg-primary mt-2"></div>
      </div>

      {/* Masonry container */}
      <div className="mt-8 md:mt-12 px-4 md:px-14">
        {/* columns-* creates the masonry effect; gap-x handled by column-gap via gap- */}
        <div className="columns-1 sm:columns-2 lg:columns-4 gap-4 [column-fill:_balance]">
          {images.map((src, i) => (
            <figure key={i} className="mb-4 break-inside-avoid">
              <img
                src={src}
                alt=""
                loading="lazy"
                className="w-full h-auto rounded-xl object-cover shadow-sm"
              />
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
