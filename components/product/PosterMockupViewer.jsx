"use client";
import Image from "next/image";
import React from "react";
import { getOptimizedImageProps } from "@/lib/imageUtils";

/** Calibrate each physical room mockup once using percentages (scales at all widths). */
const mockups = [
  {
    id: "mock1",
    src: "/images/staticMockups/staticMockup1.jpeg",
    objectPosition: "60%",
    posterTopPct: 35,
    posterLeftPct: 50,
    posterWidthPct: 23,
  },
  {
    id: "mock2",
    src: "/images/staticMockups/staticMockup2.jpeg",
    objectPosition: "50%",
    posterTopPct: 31.5,
    posterLeftPct: 55,
    posterWidthPct: 23,
  },
  {
    id: "mock3",
    src: "/images/staticMockups/staticMockup3.jpeg",
    objectPosition: "60%",
    posterTopPct: 33,
    posterLeftPct: 40,
    posterWidthPct: 24.5,
  },
];

function scaleFor(dim) {
  switch (dim) {
    case "12x18":
      return 1.0;
    case "18x24":
      return 1.3;
    case "24x36":
      return 1.5;
    default:
      return 1.0;
  }
}

// Helper: treat WxH strings as portrait if W < H
function isPortrait(dim) {
  const [w, h] = String(dim || "")
    .toLowerCase()
    .split("x")
    .map((n) => Number(n));
  return Number.isFinite(w) && Number.isFinite(h) ? w < h : false;
}

// Pixel guardrails per selected size (tweak to taste)
function boundsFor(dim) {
  switch (dim) {
    case "12x18":
      return { min: 140, max: 360 }; // M
    case "18x24":
      return { min: 180, max: 480 }; // L
    case "24x36":
      return { min: 220, max: 640 }; // XL
    default:
      return { min: 160, max: 420 };
  }
}

/** format: "physical" | "digital" */
export default function PosterMockupViewer({
  posterUrl,
  selectedDimensions,
  activeMockupIndex,
  onMockupChange,
  format,
  orientation, // NEW
}) {
  if (format === "digital") {
    // Simple centered poster with a badge placeholder (replace later with your own asset).
    return (
      <div
        className="relative w-full bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center p-4"
        style={{ aspectRatio: "16 / 9" }}
      >
        <Image
          {...getOptimizedImageProps(posterUrl, { variant: "detail" })}
          alt="Poster (Digital)"
          width={1200}
          height={1800}
          className="max-h-[90%] max-w-[80%] object-contain shadow"
          sizes="(max-width: 1024px) 80vw, 60vw"
        />
        <div className="absolute top-3 right-3 bg-blue-600 text-white text-[10px] px-2 py-1 rounded-full shadow">
          DIGITAL
        </div>
      </div>
    );
  }

  const m = mockups[activeMockupIndex] || mockups[0];
  const scale = scaleFor(selectedDimensions);

  // if orientation is provided, use it; otherwise fall back to parsing WxH
  const portraitBySize = isPortrait(selectedDimensions);
  const isPortraitFinal = orientation
    ? orientation === "portrait"
    : portraitBySize;

  const portraitFactor = isPortraitFinal ? 0.62 : 1;

  // --- poster width that respects M/L/XL (%) but never too small/large
  const pct = m.posterWidthPct * scale * portraitFactor; // your percentage logic
  const { min, max } = boundsFor(selectedDimensions);
  const posterWidth = `clamp(${min}px, ${pct}%, ${max}px)`;

  return (
    /////////////////////////////
    <div className="relative flex flex-col-reverse lg:flex-row gap-4">
      {/* Thumbs */}
      <div className="absolute bottom-2 left-2 lg:top-4 lg:bottom-auto flex lg:flex-col gap-2 z-20 bg-white/20 p-2 rounded-md shadow">
        {mockups.map((mk, idx) => (
          <button
            key={mk.id}
            onClick={() => onMockupChange(idx)}
            className={`border p-1 rounded ${
              idx === activeMockupIndex ? "border-blue-500" : "border-gray-300"
            }`}
            aria-label={`Show mockup ${idx + 1}`}
          >
            <div className="relative w-16 h-16 overflow-hidden rounded">
              <Image
                {...getOptimizedImageProps(mk.src)}
                alt=""
                fill
                className="object-cover"
                sizes="64px"
                style={{ objectPosition: mk.objectPosition }}
              />
              <Image
                {...getOptimizedImageProps(posterUrl, { variant: "thumbnail" })}
                alt=""
                width={600}
                height={900}
                className="absolute"
                style={{
                  top: `${mk.posterTopPct}%`,
                  left: `${mk.posterLeftPct}%`,
                  transform: "translate(-50%, -50%)",
                  width: `${mk.posterWidthPct * 1.1}%`,
                  height: "auto",
                  boxShadow: "-1px 1px 2px rgba(0,0,0,0.3)",
                }}
                sizes="64px"
              />
            </div>
          </button>
        ))}
      </div>

      {/* Scene */}
      {/* <div className="relative w-full bg-gray-100 rounded-lg overflow-hidden min-h-[420px] sm:min-h-[480px] md:min-h-[560px]"> */}
      <div className="relative w-full bg-gray-100 rounded-lg overflow-hidden min-h-[560px]">
        <Image
          {...getOptimizedImageProps(m.src)}
          alt="Room mockup"
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 60vw"
          style={{ objectPosition: m.objectPosition }}
        />
        <Image
          {...getOptimizedImageProps(posterUrl, { variant: "detail" })}
          alt="Poster"
          width={900}
          height={1350}
          className="absolute transition-all duration-300 ease-in-out"
          style={{
            top: `${m.posterTopPct}%`,
            left: `${m.posterLeftPct}%`,
            transform: "translate(-50%, -50%)",

            width: posterWidth, // ← dynamic % with min/max guardrails
            height: "auto",
            boxShadow: "-3px 3px 2px rgba(0,0,0,0.3)",
            zIndex: 2,
          }}
          sizes="(max-width: 1024px) 60vw, 40vw"
        />
      </div>
    </div>
  );
}
