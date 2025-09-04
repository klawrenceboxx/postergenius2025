"use client";
import React from "react";

/** Calibrate each physical room mockup once using percentages (scales at all widths). */
const mockups = [
  { id:"mock1", src:"/images/staticMockups/staticMockup1.jpeg", objectPosition:"60%", posterTopPct:35, posterLeftPct:50, posterWidthPct:23 },
  { id:"mock2", src:"/images/staticMockups/staticMockup2.jpeg", objectPosition:"50%", posterTopPct:31.5, posterLeftPct:55, posterWidthPct:23 },
  { id:"mock3", src:"/images/staticMockups/staticMockup3.jpeg", objectPosition:"60%", posterTopPct:33, posterLeftPct:40, posterWidthPct:24.5 }
];

function scaleFor(dim) {
  switch (dim) { case "12x18": return 1.0; case "18x24": return 1.3; case "24x36": return 1.6; default: return 1.0; }
}

/** format: "physical" | "digital" */
export default function PosterMockupViewer({
  posterUrl,
  selectedDimensions,
  activeMockupIndex,
  onMockupChange,
  format
}) {
  if (format === "digital") {
    // Simple centered poster with a badge placeholder (replace later with your own asset).
    return (
      <div className="relative w-full bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center p-4"
           style={{ aspectRatio:"16 / 9" }}>
        <img src={posterUrl} alt="Poster (Digital)" className="max-h-[90%] max-w-[80%] object-contain shadow" />
        <div className="absolute top-3 right-3 bg-blue-600 text-white text-[10px] px-2 py-1 rounded-full shadow">
          DIGITAL
        </div>
      </div>
    );
  }

  const m = mockups[activeMockupIndex] || mockups[0];
  const scale = scaleFor(selectedDimensions);

  return (
    <div className="relative flex flex-col-reverse lg:flex-row gap-4">
      {/* Thumbs */}
      <div className="absolute bottom-2 left-2 lg:top-4 lg:bottom-auto flex lg:flex-col gap-2 z-20 bg-white/20 p-2 rounded-md shadow">
        {mockups.map((mk, idx) => (
          <button key={mk.id} onClick={() => onMockupChange(idx)}
            className={`border p-1 rounded ${idx===activeMockupIndex?"border-blue-500":"border-gray-300"}`}
            aria-label={`Show mockup ${idx+1}`}>
            <div className="relative w-16 h-16 overflow-hidden rounded">
              <img src={mk.src} alt="" className="w-full h-full object-cover" style={{objectPosition:mk.objectPosition}} />
              <img src={posterUrl} alt="" className="absolute"
                   style={{
                     top:`${mk.posterTopPct}%`, left:`${mk.posterLeftPct}%`,
                     transform:"translate(-50%, -50%)", width:`${mk.posterWidthPct*0.18}%`, height:"auto",
                     boxShadow:"-1px 1px 2px rgba(0,0,0,0.3)"
                   }}/>
            </div>
          </button>
        ))}
      </div>

      {/* Scene */}
      <div className="relative w-full bg-gray-100 rounded-lg overflow-hidden" style={{aspectRatio:"16 / 9"}}>
        <img src={m.src} alt="Room mockup" className="absolute inset-0 w-full h-full object-cover"
             style={{objectPosition:m.objectPosition}} />
        <img src={posterUrl} alt="Poster" className="absolute transition-all duration-300 ease-in-out"
             style={{
               top:`${m.posterTopPct}%`, left:`${m.posterLeftPct}%`,
               transform:"translate(-50%, -50%)",
               width:`${m.posterWidthPct*scale}%`, height:"auto",
               boxShadow:"-3px 3px 2px rgba(0,0,0,0.3)", zIndex:2
             }}/>
      </div>
    </div>
  );
}
