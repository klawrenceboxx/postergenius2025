"use client";
import React, { useState } from "react";
import { assets } from "@/assets/assets";
import Image from "next/image";
import { useAppContext } from "@/context/AppContext";
import axios from "axios";
import toast from "react-hot-toast";
import { CATEGORIES } from "@/src/constants/categories";
import { PRINTFUL_POSTER_VARIANTS } from "@/config/printfulVariants";

export const metadata = {
  title: "Seller Dashboard | PosterGenius",
  description:
    "Add new PosterGenius products, manage pricing, and sync Printful variants from the seller dashboard.",
  alternates: { canonical: "https://postergenius.ca/seller" },
  openGraph: {
    title: "Seller Dashboard | PosterGenius",
    description:
      "Add new PosterGenius products, manage pricing, and sync Printful variants from the seller dashboard.",
    url: "https://postergenius.ca/seller",
    siteName: "PosterGenius",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Seller Dashboard | PosterGenius",
    description:
      "Add new PosterGenius products, manage pricing, and sync Printful variants from the seller dashboard.",
  },
};

const createDefaultPrintfulVariantState = () => ({
  small_12x18: PRINTFUL_POSTER_VARIANTS["12x18"]
    ? String(PRINTFUL_POSTER_VARIANTS["12x18"])
    : "",
  medium_18x24: PRINTFUL_POSTER_VARIANTS["18x24"]
    ? String(PRINTFUL_POSTER_VARIANTS["18x24"])
    : "",
  large_24x36: PRINTFUL_POSTER_VARIANTS["24x36"]
    ? String(PRINTFUL_POSTER_VARIANTS["24x36"])
    : "",
});

const AddProduct = () => {
  const { getToken } = useAppContext();

  const defaultCategory = CATEGORIES[0] || "";
  const discountOptions = Array.from({ length: 21 }, (_, index) => index * 5);

  const [files, setFiles] = useState([]);
  const [digitalFile, setDigitalFile] = useState(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(defaultCategory);
  const [physicalPriceM, setPhysicalPriceM] = useState("30");
  const [physicalPriceL, setPhysicalPriceL] = useState("40");
  const [physicalPriceXL, setPhysicalPriceXL] = useState("50");
  const [physicalDiscount, setPhysicalDiscount] = useState("0");
  const [digitalDiscount, setDigitalDiscount] = useState("0");
  const [digitalPrice, setDigitalPrice] = useState("6.5");
  const [orientation, setOrientation] = useState("portrait"); // 🆕 orientation
  const [printfulEnabled, setPrintfulEnabled] = useState(false);
  const [printfulVariantIds, setPrintfulVariantIds] = useState(
    createDefaultPrintfulVariantState
  );
  const [printfulError, setPrintfulError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedVariants = {
      small_12x18: printfulVariantIds.small_12x18.trim(),
      medium_18x24: printfulVariantIds.medium_18x24.trim(),
      large_24x36: printfulVariantIds.large_24x36.trim(),
    };

    if (printfulEnabled) {
      const invalidEntry = Object.entries(trimmedVariants).find(([_, value]) => {
        if (!value) return true;
        const numeric = Number(value);
        return !Number.isFinite(numeric) || numeric <= 0;
      });

      if (invalidEntry) {
        setPrintfulError(
          "All Printful variant IDs must be provided as positive numbers when Printful integration is enabled."
        );
        return;
      }
    }

    setPrintfulError("");

    const formData = new FormData();

    formData.append("name", name);
    formData.append("description", description);
    formData.append("category", category);
    formData.append("physicalPriceM", physicalPriceM);
    formData.append("physicalPriceL", physicalPriceL);
    formData.append("physicalPriceXL", physicalPriceXL);
    formData.append("physicalDiscount", physicalDiscount);
    formData.append("digitalDiscount", digitalDiscount);
    formData.append("digitalPrice", digitalPrice || 0);
    formData.append("orientation", orientation); // 🆕 push orientation

    for (let i = 0; i < files.length; i++) {
      if (files[i]) {
        formData.append("images", files[i]);
      }
    }

    if (digitalFile) {
      console.log("Uploading digital file:", digitalFile.name); // 🛠 debug
      formData.append("digitalFile", digitalFile, digitalFile.name); // 🆕 include filename
    }

    formData.append("printfulEnabled", printfulEnabled ? "true" : "false");
    formData.append("isPrintfulEnabled", printfulEnabled ? "true" : "false");
    formData.append(
      "printfulVariantIds",
      JSON.stringify({
        small_12x18: trimmedVariants.small_12x18 || null,
        medium_18x24: trimmedVariants.medium_18x24 || null,
        large_24x36: trimmedVariants.large_24x36 || null,
      })
    );

    try {
      const token = await getToken();
      const { data } = await axios.post("/api/product/add", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
        toast.success(data.message);
        setFiles([]);
        setDigitalFile(null);
        setName("");
        setDescription("");
        setCategory(defaultCategory);
        setPhysicalPriceM("30");
        setPhysicalPriceL("40");
        setPhysicalPriceXL("50");
        setPhysicalDiscount("0");
        setDigitalDiscount("0");
        setDigitalPrice("6.5");
        setOrientation("portrait"); // reset 🆕
        setPrintfulEnabled(false);
        setPrintfulVariantIds(createDefaultPrintfulVariantState());
        setPrintfulError("");
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="flex-1 min-h-screen flex flex-col justify-between">
      <form onSubmit={handleSubmit} className="md:p-10 p-4 space-y-5 max-w-lg">
        <h1 className="text-3xl font-semibold text-blackhex mb-6">
          Seller Dashboard | PosterGenius
        </h1>
        {/* Images */}
        <div>
          <p className="text-base font-medium">Product Image</p>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            {[...Array(4)].map((_, index) => (
              <label key={index} htmlFor={`image${index}`}>
                <input
                  onChange={(e) => {
                    const updatedFiles = [...files];
                    updatedFiles[index] = e.target.files[0];
                    setFiles(updatedFiles);
                  }}
                  type="file"
                  id={`image${index}`}
                  hidden
                />
                <Image
                  key={index}
                  className="max-w-24 cursor-pointer"
                  src={
                    files[index]
                      ? URL.createObjectURL(files[index])
                      : assets.upload_area
                  }
                  alt=""
                  width={100}
                  height={100}
                />
              </label>
            ))}
          </div>
        </div>

        {/* Product Name */}
        <div className="flex flex-col gap-1 max-w-md">
          <label className="text-base font-medium" htmlFor="product-name">
            Product Name
          </label>
          <input
            id="product-name"
            type="text"
            placeholder="Type here"
            className="outline-none md:py-2.5 py-2 px-3 rounded border border-gray-500/40"
            onChange={(e) => setName(e.target.value)}
            value={name}
            required
          />
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1 max-w-md">
          <label
            className="text-base font-medium"
            htmlFor="product-description"
          >
            Product Description
          </label>
          <textarea
            id="product-description"
            rows={4}
            className="outline-none md:py-2.5 py-2 px-3 rounded border border-gray-500/40 resize-none"
            placeholder="Type here"
            onChange={(e) => setDescription(e.target.value)}
            value={description}
            required
          ></textarea>
        </div>

        {/* Digital File */}
        <div className="flex flex-col gap-1 max-w-md">
          <label className="text-base font-medium" htmlFor="digital-file">
            Digital File (PDF/ZIP/PNG/JPG)
          </label>
          <input
            id="digital-file"
            type="file"
            accept=".pdf,.zip,.png,.jpg,.jpeg"
            className="outline-none md:py-2.5 py-2 px-3 rounded border border-gray-500/40"
            onChange={(e) => setDigitalFile(e.target.files?.[0] || null)}
          />
          {digitalFile && (
            <span className="text-xs text-gray-500">
              Selected: {digitalFile.name}
            </span>
          )}
        </div>

        {/* Category + Digital */}
        <div className="flex items-center gap-5 flex-wrap">
          <div className="flex flex-col gap-1 w-32">
            <label className="text-base font-medium" htmlFor="category">
              Category
            </label>
            <select
              id="category"
              className="outline-none md:py-2.5 py-2 px-3 rounded border border-gray-500/40"
              onChange={(e) => setCategory(e.target.value)}
              value={category}
            >
              {CATEGORIES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1 w-32">
            <label className="text-base font-medium" htmlFor="digital-price">
              Digital Price
            </label>
            <input
              id="digital-price"
              type="number"
              min="0"
              step="0.01"
              placeholder="0"
              className="outline-none md:py-2.5 py-2 px-3 rounded border border-gray-500/40"
              onChange={(e) => setDigitalPrice(e.target.value)}
              value={digitalPrice}
            />
          </div>
        </div>

        {/* Physical Prices */}
        <div className="flex items-center gap-5 flex-wrap">
          <div className="flex flex-col gap-1 w-32">
            <label className="text-base font-medium" htmlFor="physical-price-m">
              Product (M) Price
            </label>
            <input
              id="physical-price-m"
              type="number"
              min="0.01"
              step="0.01"
              className="outline-none md:py-2.5 py-2 px-3 rounded border border-gray-500/40"
              onChange={(e) => setPhysicalPriceM(e.target.value)}
              value={physicalPriceM}
              required
            />
          </div>
          <div className="flex flex-col gap-1 w-32">
            <label className="text-base font-medium" htmlFor="physical-price-l">
              Product (L) Price
            </label>
            <input
              id="physical-price-l"
              type="number"
              min="0.01"
              step="0.01"
              className="outline-none md:py-2.5 py-2 px-3 rounded border border-gray-500/40"
              onChange={(e) => setPhysicalPriceL(e.target.value)}
              value={physicalPriceL}
            />
          </div>
          <div className="flex flex-col gap-1 w-32">
            <label className="text-base font-medium" htmlFor="physical-price-xl">
              Product (XL) Price
            </label>
            <input
              id="physical-price-xl"
              type="number"
              min="0.01"
              step="0.01"
              className="outline-none md:py-2.5 py-2 px-3 rounded border border-gray-500/40"
              onChange={(e) => setPhysicalPriceXL(e.target.value)}
              value={physicalPriceXL}
            />
          </div>
        </div>

        {/* Discounts */}
        <div className="flex items-center gap-5 flex-wrap">
          <div className="flex flex-col gap-1 w-40">
            <label className="text-base font-medium" htmlFor="physical-discount">
              Physical Discount (%)
            </label>
            <select
              id="physical-discount"
              className="outline-none md:py-2.5 py-2 px-3 rounded border border-gray-500/40"
              value={physicalDiscount}
              onChange={(e) => setPhysicalDiscount(e.target.value)}
            >
              {discountOptions.map((option) => (
                <option key={option} value={option}>
                  {option}%
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1 w-40">
            <label className="text-base font-medium" htmlFor="digital-discount">
              Digital Discount (%)
            </label>
            <select
              id="digital-discount"
              className="outline-none md:py-2.5 py-2 px-3 rounded border border-gray-500/40"
              value={digitalDiscount}
              onChange={(e) => setDigitalDiscount(e.target.value)}
            >
              {discountOptions.map((option) => (
                <option key={option} value={option}>
                  {option}%
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Orientation */}
        <div className="flex flex-col gap-1 w-40">
          <label className="text-base font-medium" htmlFor="orientation">
            Orientation
          </label>
          <select
            id="orientation"
            className="outline-none md:py-2.5 py-2 px-3 rounded border border-gray-500/40"
            value={orientation}
            onChange={(e) => setOrientation(e.target.value)}
          >
            <option value="portrait">Portrait</option>
            <option value="landscape">Landscape</option>
          </select>
        </div>

        {/* Printful */}
        <div className="flex items-center gap-3">
          <input
            id="printful-enabled"
            type="checkbox"
            className="h-4 w-4"
            checked={printfulEnabled}
            onChange={(e) => {
              const checked = e.target.checked;
              setPrintfulEnabled(checked);
              if (!checked) {
                setPrintfulError("");
              }
            }}
          />
          <label htmlFor="printful-enabled" className="text-base font-medium">
            Enable Printful fulfillment
          </label>
        </div>

        {printfulEnabled && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Enter the Printful variant ID that corresponds to each poster size.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium" htmlFor="variant-12x18">
                  12×18 Variant ID
                </label>
                <input
                  id="variant-12x18"
                  type="number"
                  inputMode="numeric"
                  className="outline-none md:py-2.5 py-2 px-3 rounded border border-gray-500/40"
                  value={printfulVariantIds.small_12x18}
                  onChange={(event) =>
                    setPrintfulVariantIds((prev) => ({
                      ...prev,
                      small_12x18: event.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium" htmlFor="variant-18x24">
                  18×24 Variant ID
                </label>
                <input
                  id="variant-18x24"
                  type="number"
                  inputMode="numeric"
                  className="outline-none md:py-2.5 py-2 px-3 rounded border border-gray-500/40"
                  value={printfulVariantIds.medium_18x24}
                  onChange={(event) =>
                    setPrintfulVariantIds((prev) => ({
                      ...prev,
                      medium_18x24: event.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium" htmlFor="variant-24x36">
                  24×36 Variant ID
                </label>
                <input
                  id="variant-24x36"
                  type="number"
                  inputMode="numeric"
                  className="outline-none md:py-2.5 py-2 px-3 rounded border border-gray-500/40"
                  value={printfulVariantIds.large_24x36}
                  onChange={(event) =>
                    setPrintfulVariantIds((prev) => ({
                      ...prev,
                      large_24x36: event.target.value,
                    }))
                  }
                  required
                />
              </div>
            </div>
            {printfulError && (
              <p className="text-sm text-red-600">{printfulError}</p>
            )}
          </div>
        )}

        <button
          type="submit"
          className="px-8 py-2.5 bg-orange-600 text-white font-medium rounded"
        >
          ADD
        </button>
      </form>
    </div>
  );
};

export default AddProduct;
