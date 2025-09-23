"use client";
import { useState } from "react";
import PosterMockupViewer from "@/components/product/PosterMockupViewer";
import Infos from "@/components/product/Infos";
import Link from "next/link";

export default function ProductPage({ product }) {
  const [selectedDimensions, setSelectedDimensions] = useState(
    product?.variations?.[0]?.sizes?.[0]?.size || "12x18"
  );
  const [activeMockupIndex, setActiveMockupIndex] = useState(0);
  const [format, setFormat] = useState("physical"); // "physical" | "digital"

  return (
    <div className="w-full">
      {/* Breadcrumb spans the page, not just the left column */}
      <nav className="text-sm text-gray-600 mb-4">
        <Link href="/shop" className="hover:text-black">
          Browse All
        </Link>
        <span className="mx-2">›</span>
        <span className="text-gray-900 font-medium">
          {product?.title || product?.name || "Product"}
        </span>
      </nav>

      {/* Two-column layout */}
      <div className="flex flex-col lg:flex-row w-full gap-8">
        <div className="flex-1 min-w-0">
          <PosterMockupViewer
            posterUrl={product.imageUrl}
            selectedDimensions={selectedDimensions}
            activeMockupIndex={activeMockupIndex}
            onMockupChange={setActiveMockupIndex}
            format={format}
            orientation={product.orientation}
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
    </div>
  );
}
