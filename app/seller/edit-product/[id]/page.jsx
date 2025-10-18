"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import axios from "axios";
import toast from "react-hot-toast";
import { useParams } from "next/navigation";

import { assets } from "@/assets/assets";
import Loading from "@/components/Loading";
import { useAppContext } from "@/context/AppContext";
import { CATEGORIES } from "@/src/constants/categories";
import { PRINTFUL_POSTER_VARIANTS } from "@/config/printfulVariants";

export const metadata = {
  title: "Edit Product | PosterGenius",
  description:
    "Update PosterGenius product details, pricing, imagery, and Printful settings directly from the seller portal.",
  alternates: { canonical: "https://postergenius.ca/seller/edit-product" },
  openGraph: {
    title: "Edit Product | PosterGenius",
    description:
      "Update PosterGenius product details, pricing, imagery, and Printful settings directly from the seller portal.",
    url: "https://postergenius.ca/seller/edit-product",
    siteName: "PosterGenius",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Edit Product | PosterGenius",
    description:
      "Update PosterGenius product details, pricing, imagery, and Printful settings directly from the seller portal.",
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

const EditProductPage = () => {
  const params = useParams();
  const productId = params?.id;

  const { getToken, router } = useAppContext();

  const defaultCategory = CATEGORIES[0] || "";
  const discountOptions = Array.from({ length: 21 }, (_, index) => index * 5);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [files, setFiles] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(defaultCategory);
  const [physicalPriceM, setPhysicalPriceM] = useState("30");
  const [physicalPriceL, setPhysicalPriceL] = useState("40");
  const [physicalPriceXL, setPhysicalPriceXL] = useState("50");
  const [physicalDiscount, setPhysicalDiscount] = useState("0");
  const [digitalDiscount, setDigitalDiscount] = useState("0");
  const [digitalPrice, setDigitalPrice] = useState("6.5");
  const [orientation, setOrientation] = useState("portrait");
  const [printfulEnabled, setPrintfulEnabled] = useState(false);
  const [printfulVariantIds, setPrintfulVariantIds] = useState(
    createDefaultPrintfulVariantState
  );
  const [printfulError, setPrintfulError] = useState("");

  const [digitalFile, setDigitalFile] = useState(null);
  const [removeDigitalFile, setRemoveDigitalFile] = useState(false);
  const [hasExistingDigitalFile, setHasExistingDigitalFile] = useState(false);
  const [existingDigitalFileName, setExistingDigitalFileName] = useState("");

  const fetchProduct = async () => {
    if (!productId) return;

    setLoading(true);
    try {
      const token = await getToken();
      const { data } = await axios.get(`/api/product/${productId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
        const product = data.product;
        setName(product.name || "");
        setDescription(product.description || "");
        setCategory(product.category || defaultCategory);
        setPhysicalPriceM(
          product.physicalPrices?.M != null
            ? String(product.physicalPrices.M)
            : "30"
        );
        setPhysicalPriceL(
          product.physicalPrices?.L != null
            ? String(product.physicalPrices.L)
            : "40"
        );
        setPhysicalPriceXL(
          product.physicalPrices?.XL != null
            ? String(product.physicalPrices.XL)
            : "50"
        );
        setPhysicalDiscount(
          product.physicalDiscount != null
            ? String(product.physicalDiscount)
            : "0"
        );
        setDigitalDiscount(
          product.digitalDiscount != null
            ? String(product.digitalDiscount)
            : "0"
        );
        setDigitalPrice(
          product.digitalPrice != null ? String(product.digitalPrice) : "6.5"
        );
        setExistingImages(product.image || []);
        const remotePrintfulEnabled = Boolean(
          product.isPrintfulEnabled ??
            product.printfulEnabled ??
            product.PrintfulEnabled
        );
        setPrintfulEnabled(remotePrintfulEnabled);
        const defaultVariants = createDefaultPrintfulVariantState();
        setPrintfulVariantIds({
          small_12x18: product.printfulVariantIds?.small_12x18
            ? String(product.printfulVariantIds.small_12x18)
            : defaultVariants.small_12x18,
          medium_18x24: product.printfulVariantIds?.medium_18x24
            ? String(product.printfulVariantIds.medium_18x24)
            : defaultVariants.medium_18x24,
          large_24x36: product.printfulVariantIds?.large_24x36
            ? String(product.printfulVariantIds.large_24x36)
            : defaultVariants.large_24x36,
        });
        setOrientation(product.orientation || "portrait");

        const hasFile = Boolean(
          product.digitalFileKey || product.digitalFileUrl
        );
        setHasExistingDigitalFile(hasFile);
        const fileName =
          product.digitalFileName ||
          (product.digitalFileKey
            ? product.digitalFileKey.split("/").pop()
            : "");
        setExistingDigitalFileName(fileName || "");
        setDigitalFile(null);
        setRemoveDigitalFile(false);
      } else {
        toast.error(data.message || "Failed to load product");
      }
    } catch (error) {
      toast.error(error.message || "Failed to load product");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const handleRemoveExistingImage = (index) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDigitalFileChange = (event) => {
    const file = event.target.files?.[0] || null;
    setDigitalFile(file);
    if (file) {
      setRemoveDigitalFile(false);
    }
  };

  const handleRemoveDigitalFile = () => {
    setDigitalFile(null);
    setRemoveDigitalFile(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!productId) return;

    setSaving(true);
    try {
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
          setSaving(false);
          return;
        }
      }

      setPrintfulError("");

      const token = await getToken();
      const formData = new FormData();
      formData.append("name", name);
      formData.append("description", description);
      formData.append("category", category);
      formData.append("physicalPriceM", physicalPriceM);
      formData.append("physicalPriceL", physicalPriceL);
      formData.append("physicalPriceXL", physicalPriceXL);
      formData.append("physicalDiscount", physicalDiscount);
      formData.append("digitalDiscount", digitalDiscount);
      formData.append("digitalPrice", digitalPrice);
      formData.append("existingImages", JSON.stringify(existingImages));
      formData.append("printfulEnabled", printfulEnabled ? "true" : "false");
      formData.append("isPrintfulEnabled", printfulEnabled ? "true" : "false");
      formData.append("orientation", orientation);
      formData.append(
        "printfulVariantIds",
        JSON.stringify({
          small_12x18: trimmedVariants.small_12x18 || null,
          medium_18x24: trimmedVariants.medium_18x24 || null,
          large_24x36: trimmedVariants.large_24x36 || null,
        })
      );

      files.forEach((file) => {
        if (file) {
          formData.append("images", file);
        }
      });

      if (digitalFile) {
        formData.append("digitalFile", digitalFile);
      }

      if (removeDigitalFile && !digitalFile) {
        formData.append("removeDigitalFile", "true");
      }

      const { data } = await axios.put(`/api/product/${productId}`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
        toast.success("Product updated successfully");
        router.push("/seller/product-list");
      } else {
        toast.error(data.message || "Failed to update product");
      }
    } catch (error) {
      toast.error(error.message || "Failed to update product");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="flex-1 min-h-screen flex flex-col justify-between">
      <form onSubmit={handleSubmit} className="md:p-10 p-4 space-y-5 max-w-2xl">
        <h1 className="text-3xl font-semibold text-blackhex mb-6">
          Edit Product | PosterGenius
        </h1>
        <div>
          <p className="text-base font-medium">Current Images</p>
          {existingImages.length > 0 ? (
            <div className="flex flex-wrap items-center gap-3 mt-2">
              {existingImages.map((image, index) => (
                <div key={image} className="relative">
                  <Image
                    src={image}
                    alt="Product image"
                    className="max-w-24 rounded"
                    width={100}
                    height={100}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveExistingImage(index)}
                    className="absolute top-1 right-1 bg-black/60 text-white text-xs px-1 rounded"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 mt-2">
              No images selected. Please add new images below.
            </p>
          )}
        </div>
        <div>
          <p className="text-base font-medium">Add / Replace Images</p>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            {[...Array(4)].map((_, index) => (
              <label key={index} htmlFor={`image${index}`}>
                <input
                  onChange={(e) => {
                    const updatedFiles = [...files];
                    updatedFiles[index] = e.target.files?.[0] || null;
                    setFiles(updatedFiles);
                  }}
                  type="file"
                  id={`image${index}`}
                  hidden
                />
                <Image
                  className="max-w-24 cursor-pointer"
                  src={
                    files[index]
                      ? URL.createObjectURL(files[index])
                      : assets.upload_area
                  }
                  alt="Upload placeholder"
                  width={100}
                  height={100}
                />
              </label>
            ))}
          </div>
        </div>

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

        <div className="flex flex-col gap-1 max-w-md">
          <label className="text-base font-medium" htmlFor="product-description">
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

        <div className="flex flex-col gap-1 max-w-md">
          <label className="text-base font-medium" htmlFor="digital-file">
            Digital File (PDF/ZIP)
          </label>
          <input
            id="digital-file"
            type="file"
            accept=".pdf,.zip,.png,.jpg,.jpeg"
            className="outline-none md:py-2.5 py-2 px-3 rounded border border-gray-500/40"
            onChange={handleDigitalFileChange}
          />
          {digitalFile ? (
            <div className="flex items-center justify-between text-xs text-gray-600 mt-1">
              <span>New file: {digitalFile.name}</span>
              <button
                type="button"
                className="text-red-500"
                onClick={() => setDigitalFile(null)}
              >
                Clear
              </button>
            </div>
          ) : hasExistingDigitalFile && !removeDigitalFile ? (
            <div className="flex items-center justify-between text-xs text-gray-600 mt-1">
              <span>
                Current file:
                <span className="ml-1 font-medium">
                  {existingDigitalFileName || "Available"}
                </span>
              </span>
              <button
                type="button"
                className="text-red-500"
                onClick={handleRemoveDigitalFile}
              >
                Remove
              </button>
            </div>
          ) : null}
          {removeDigitalFile && !digitalFile && (
            <p className="text-xs text-red-500 mt-1 flex items-center gap-2">
              <span>The current digital file will be removed when you save.</span>
              <button
                type="button"
                className="text-blue-500"
                onClick={() => setRemoveDigitalFile(false)}
              >
                Keep file
              </button>
            </p>
          )}
        </div>

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

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            className="px-8 py-2.5 bg-orange-600 text-white font-medium rounded"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <button
            type="button"
            className="px-6 py-2 border border-gray-400 rounded"
            onClick={() => router.push("/seller/product-list")}
            disabled={saving}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditProductPage;
