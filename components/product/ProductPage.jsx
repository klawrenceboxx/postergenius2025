"use client";
import { useState } from "react";
import PosterMockupViewer from "@/components/product/PosterMockupViewer";
import Infos from "@/components/product/Infos";

export default function ProductPage({ product }) {
  const [selectedDimensions, setSelectedDimensions] = useState("12x18");
  const [activeMockupIndex, setActiveMockupIndex] = useState(0);
  const [format, setFormat] = useState("physical"); // "physical" | "digital"

  return (
    <div className="flex flex-col lg:flex-row w-full gap-8">
      <div className="flex-1 min-w-0">
        <PosterMockupViewer
          posterUrl={product.imageUrl}
          selectedDimensions={selectedDimensions}
          activeMockupIndex={activeMockupIndex}
          onMockupChange={setActiveMockupIndex}
          format={format}
        />
      </div>
      <div className="w-full md:w-[360px] flex-shrink-0">
        <Infos
          product={product}
          selectedDimensions={selectedDimensions}
          onDimensionsChange={setSelectedDimensions}
          format={format}
          onFormatChange={setFormat}
        />
      </div>
    </div>
  );
}
