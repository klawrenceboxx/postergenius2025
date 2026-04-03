"use client";
import Image from "next/image";
import React, { useState } from "react";
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

const digitalSpeckles = [
  { top: "12%", left: "18%", size: 2, delay: "0s", duration: "8s" },
  { top: "22%", left: "76%", size: 3, delay: "1.5s", duration: "10s" },
  { top: "34%", left: "62%", size: 2, delay: "0.8s", duration: "9s" },
  { top: "48%", left: "14%", size: 2, delay: "2.2s", duration: "11s" },
  { top: "58%", left: "81%", size: 3, delay: "1.1s", duration: "9.5s" },
  { top: "67%", left: "41%", size: 2, delay: "2.8s", duration: "12s" },
  { top: "74%", left: "23%", size: 3, delay: "0.4s", duration: "10.5s" },
  { top: "81%", left: "69%", size: 2, delay: "1.9s", duration: "8.5s" },
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
  const [digitalScale, setDigitalScale] = useState(1);

  const handleDigitalWheel = (event) => {
    if (format !== "digital") return;
    event.preventDefault();

    const direction = event.deltaY < 0 ? 0.08 : -0.08;
    setDigitalScale((current) => {
      const next = current + direction;
      return Math.min(2, Math.max(1, Number(next.toFixed(2))));
    });
  };

  if (format === "digital") {
    return (
      <div
        className="relative w-full overflow-hidden rounded-lg min-h-[560px] xl:min-h-[680px] 2xl:min-h-[760px]"
        onWheel={handleDigitalWheel}
        style={{
          background:
            "radial-gradient(circle at 50% 42%, rgba(155,122,36,0.18) 0%, rgba(96,72,18,0.10) 18%, rgba(20,18,16,0.96) 48%, #090909 100%)",
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,214,102,0.06),transparent_38%)]" />
        {digitalSpeckles.map((speckle, index) => (
          <span
            key={`speckle-${index}`}
            className="absolute rounded-full"
            style={{
              top: speckle.top,
              left: speckle.left,
              width: `${speckle.size}px`,
              height: `${speckle.size}px`,
              background:
                "radial-gradient(circle, rgba(255,220,140,0.9) 0%, rgba(212,167,74,0.55) 45%, rgba(212,167,74,0) 100%)",
              boxShadow: "0 0 10px rgba(212,167,74,0.18)",
              opacity: 0.5,
              animation: `digitalSpecklePulse ${speckle.duration} ease-in-out ${speckle.delay} infinite`,
            }}
          />
        ))}
        <Image
          {...getOptimizedImageProps(posterUrl, { variant: "detail" })}
          alt="Poster (Digital)"
          width={1200}
          height={1800}
          className="absolute left-1/2 top-1/2 max-h-[82%] w-auto max-w-[78%] -translate-x-1/2 -translate-y-1/2 object-contain shadow transition-transform duration-150 ease-out"
          sizes="(max-width: 1024px) 60vw, 40vw"
          style={{
            transform: `translate(-50%, -50%) scale(${digitalScale})`,
            boxShadow: "0 18px 36px rgba(0,0,0,0.38)",
          }}
        />
        <div className="absolute top-3 right-3 rounded-full bg-secondary px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white">
          DIGITAL
        </div>
        <div className="absolute bottom-4 right-4 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-white/70 backdrop-blur-sm">
          Scroll to zoom
        </div>
        <style jsx>{`
          @keyframes digitalSpecklePulse {
            0%,
            100% {
              opacity: 0.18;
              transform: scale(1);
            }
            50% {
              opacity: 0.5;
              transform: scale(1.35);
            }
          }
        `}</style>
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
  const posterWidth = `${min}px`;

  return (
    /////////////////////////////
    <div className="relative flex flex-col-reverse gap-4 lg:flex-row">
      {/* Thumbs */}
      <div className="absolute bottom-2 left-2 z-20 flex gap-2 rounded-md bg-white/20 p-2 shadow lg:bottom-auto lg:top-4 lg:flex-col">
        {mockups.map((mk, idx) => (
          <button
            key={mk.id}
            onClick={() => onMockupChange(idx)}
            className={`rounded border p-1 ${
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
      <div className="relative w-full overflow-hidden rounded-lg bg-gray-100 min-h-[560px] xl:min-h-[680px] 2xl:min-h-[760px]">
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
            zIndex: 0,
          }}
          sizes="(max-width: 1024px) 60vw, 40vw"
        />
      </div>
    </div>
  );
}
