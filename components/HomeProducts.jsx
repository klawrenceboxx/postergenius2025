import React from "react";
import ProductCard from "./ProductCard";
import { useAppContext } from "@/context/AppContext";

const HomeProducts = () => {
  const { products, router } = useAppContext();

  return (
    <div className="flex flex-col items-center pt-14  w-auto border-t mt-4">
      <p className=" text-4xl text-blackhex font-[400]">Popular Products</p>
      <div className="w-28 h-0.5 bg-primary mt-2 mb-4"></div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 flex-col items-center gap-6 mt-6 pb-14 w-full">
        {products.map((product, index) => (
          <ProductCard key={index} product={product} />
          // <ProductCard key={index} product={product} orientation={product.orientation} />
        ))}
      </div>
      <button
        onClick={() => {
          router.push("/all-products");
        }}
        className="px-10 py-4 rounded-full bg-white border-2 border-blackhex text-blackhex hover:bg-blackhex hover:text-white hover:border-white transition font-[700]"
      >
        See more
      </button>
    </div>
  );
};

export default HomeProducts;
