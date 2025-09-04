"use client";
import React, { useMemo } from "react";
import { useAppContext } from "@/context/AppContext";

const label = (d)=> d==="12x18"?"M":d==="18x24"?"L":d==="24x36"?"XL":d;

export default function Infos({
  product,
  selectedDimensions,
  onDimensionsChange,
  format,
  onFormatChange,
}) {
  const { addToCart } = useAppContext();

  const sizes = useMemo(() => {
    const s = product?.variations?.[0]?.sizes || [];
    if (s.length) return s.map(x => ({ label: label(x.size), dimensions: x.size, price: x.price }));
    const base = product.finalPrice ?? product.price;
    return [
      { label:"M", dimensions:"12x18", price: base },
      { label:"L", dimensions:"18x24", price: Math.round(base*1.2*100)/100 },
      { label:"XL", dimensions:"24x36", price: Math.round(base*1.5*100)/100 }
    ];
  }, [product]);

  const currentPhysical = sizes.find(s => s.dimensions===selectedDimensions) || sizes[0];
  const digitalPrice = product.digitalPrice ?? Math.round((product.finalPrice ?? product.price) * 0.6 * 100)/100;
  const price = format==="digital" ? digitalPrice : currentPhysical.price;

  const add = () => {
    addToCart({
      productId: product._id || "",
      title: product.title,
      imageUrl: product.imageUrl,
      price,
      quantity: 1,
      slug: product.slug,
      format,
      dimensions: format === "digital" ? "digital" : selectedDimensions,
    });
  };

  return (
    <div className="bg-white w-full">
      <h1 className="text-2xl font-bold">{product.title}</h1>
      <p className="text-gray-600 mt-2">{product.description || "No description available."}</p>

      {/* Format */}
      <div className="mt-4">
        <h3 className="text-md font-bold mb-2">Format</h3>
        <div className="inline-flex items-center p-1 border border-gray-300 rounded-full bg-gray-100">
          {["physical","digital"].map(opt=>{
            const sel = opt===format;
            return (
              <button key={opt} onClick={()=>onFormatChange(opt)}
                className={`px-3 py-2 text-sm font-medium rounded-full transition-all ${sel?"bg-white text-blue-600 border border-blue-600 shadow":"text-gray-700 hover:bg-gray-200"}`}
                style={{minWidth:120}}>
                {opt==="physical"?"Physical Print":"Digital Download"}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sizes (physical only) */}
      {format==="physical" && (
        <div className="mt-4">
          <h3 className="text-md font-bold mb-2">Choose size</h3>
          <div className="inline-flex items-center p-1 border border-gray-300 rounded-full bg-gray-100">
            {sizes.map(s=>{
              const sel = s.dimensions===selectedDimensions;
              return (
                <button key={s.dimensions} onClick={()=>onDimensionsChange(s.dimensions)}
                  className={`px-3 py-2 text-sm font-medium rounded-full transition-all ${sel?"bg-white text-blue-600 border border-blue-600 shadow":"text-gray-700 hover:bg-gray-200"}`}
                  style={{minWidth:60}}>
                  {sel?`${s.label} (${s.dimensions})`:s.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Price */}
      <div className="mt-4">
        <p className="text-lg font-semibold">
          ${price.toFixed(2)} {format==="digital" &&
            <span className="ml-2 text-gray-500 text-sm">
              instant download • includes common ratios (2:3, 3:4, 4:5, 1:1, A-series) • 300 DPI sRGB JPG/PNG • up to 24×36 • includes square, bordered & text variants
            </span>}
        </p>
      </div>

      {/* Reviews */}
      <div className="mt-4">
        <h2 className="text-lg font-semibold">Reviews:</h2>
        {(product.reviews||[]).length
          ? product.reviews.map((r,i)=>(
              <div key={i} className="mt-2">
                <div className="flex items-center text-yellow-400">{Array.from({length:Math.floor(r.rating||0)}).map((_,j)=><span key={j}>&#9733;</span>)}{r.rating%1!==0 && <span>&#9734;</span>}</div>
                {r.reviewText && <p className="text-gray-800 mt-1">"{r.reviewText}"</p>}
              </div>
            ))
          : <p className="text-gray-600">No reviews yet.</p>}
      </div>

      <div className="mt-6">
        <button onClick={add}
          className="w-full bg-blue-500 text-white px-4 py-3 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 transition shadow hover:shadow-lg">
          {format==="digital" ? "Buy Digital Download" : "Add to Cart"}
        </button>
      </div>
    </div>
  );
}
