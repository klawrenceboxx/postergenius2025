"use client";
import React, { useState } from "react";
import { assets } from "@/assets/assets";
import Image from "next/image";
import { useAppContext } from "@/context/AppContext";
import axios from "axios";
import toast from "react-hot-toast";
import { CATEGORIES } from "@/src/constants/categories";

const AddProduct = () => {
  const { getToken } = useAppContext();

  const defaultCategory = CATEGORIES[0] || "";

  const [files, setFiles] = useState([]);
  const [digitalFile, setDigitalFile] = useState(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(defaultCategory);
  const [price, setPrice] = useState("");
  const [offerPrice, setOfferPrice] = useState("");
  const [digitalPrice, setDigitalPrice] = useState(""); // 🆕 digital price
  const [orientation, setOrientation] = useState("portrait"); // 🆕 orientation
  const [printfulEnabled, setPrintfulEnabled] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();

    formData.append("name", name);
    formData.append("description", description);
    formData.append("category", category);
    formData.append("price", price);
    formData.append("offerPrice", offerPrice);
    formData.append("digitalPrice", digitalPrice || 0); // 🆕 push digital price
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
        setPrice("");
        setOfferPrice("");
        setDigitalPrice(""); // reset 🆕
        setOrientation("portrait"); // reset 🆕
        setPrintfulEnabled(false);
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

        {/* Category + Prices */}
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
            <label className="text-base font-medium" htmlFor="product-price">
              Product Price
            </label>
            <input
              id="product-price"
              type="number"
              placeholder="0"
              className="outline-none md:py-2.5 py-2 px-3 rounded border border-gray-500/40"
              onChange={(e) => setPrice(e.target.value)}
              value={price}
              required
            />
          </div>
          <div className="flex flex-col gap-1 w-32">
            <label className="text-base font-medium" htmlFor="offer-price">
              Offer Price
            </label>
            <input
              id="offer-price"
              type="number"
              placeholder="0"
              className="outline-none md:py-2.5 py-2 px-3 rounded border border-gray-500/40"
              onChange={(e) => setOfferPrice(e.target.value)}
              value={offerPrice}
            />
          </div>
          <div className="flex flex-col gap-1 w-32">
            <label className="text-base font-medium" htmlFor="digital-price">
              Digital Price
            </label>
            <input
              id="digital-price"
              type="number"
              placeholder="0"
              className="outline-none md:py-2.5 py-2 px-3 rounded border border-gray-500/40"
              onChange={(e) => setDigitalPrice(e.target.value)}
              value={digitalPrice}
            />
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
            onChange={(e) => setPrintfulEnabled(e.target.checked)}
          />
          <label htmlFor="printful-enabled" className="text-base font-medium">
            Enable Printful fulfillment
          </label>
        </div>

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
