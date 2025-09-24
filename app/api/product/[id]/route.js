import { v2 as cloudinary } from "cloudinary";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import authSeller from "@/lib/authSeller";
import connectDB from "@/config/db";
import Product from "@/models/Product";
import { uploadFileToS3, deleteFileFromS3 } from "@/lib/s3";
import { validateDigitalFile } from "@/lib/digitalFiles";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadImageToCloudinary = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: "auto" },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result.secure_url);
        }
      }
    );
    stream.end(buffer);
  });
};

export async function GET(request, { params }) {
  try {
    const { userId } = getAuth(request);
    const isSeller = await authSeller(userId);

    if (isSeller !== true) {
      return NextResponse.json({ success: false, message: "Unauthorized" });
    }

    await connectDB();

    const product = await Product.findById(params.id);
    if (!product || product.userId !== userId) {
      return NextResponse.json({ success: false, message: "Product not found" });
    }

    return NextResponse.json({ success: true, product });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message });
  }
}

export async function PUT(request, { params }) {
  try {
    const { userId } = getAuth(request);
    const isSeller = await authSeller(userId);

    if (isSeller !== true) {
      return NextResponse.json({ success: false, message: "Unauthorized" });
    }

    const formData = await request.formData();

    const name = formData.get("name");
    const description = formData.get("description");
    const category = formData.get("category");
    const price = formData.get("price");
    const offerPrice = formData.get("offerPrice");
    const printfulEnabled =
      formData.get("printfulEnabled") === "true" ||
      formData.get("printfulEnabled") === "on";
    const digitalFile = formData.get("digitalFile");
    const removeDigitalFile =
      formData.get("removeDigitalFile") === "true" ||
      formData.get("removeDigitalFile") === "on";

    const existingImagesRaw = formData.get("existingImages");
    let existingImages = [];

    if (existingImagesRaw) {
      try {
        const parsed = JSON.parse(existingImagesRaw);
        if (Array.isArray(parsed)) {
          existingImages = parsed.filter((value) => typeof value === "string");
        }
      } catch (error) {
        console.warn("Failed to parse existing images", error);
      }
    }

    const files = (formData.getAll("images") || []).filter(
      (file) => file && typeof file.arrayBuffer === "function"
    );

    const uploadedImages = await Promise.all(
      files.map((file) => uploadImageToCloudinary(file))
    );

    await connectDB();

    const product = await Product.findById(params.id);
    if (!product || product.userId !== userId) {
      return NextResponse.json({ success: false, message: "Product not found" });
    }

    if (!name || !description || !category || !price) {
      return NextResponse.json({
        success: false,
        message: "Missing required fields",
      });
    }

    const numericPrice = Number(price);
    const numericOfferPrice = offerPrice ? Number(offerPrice) : null;

    if (Number.isNaN(numericPrice)) {
      return NextResponse.json({
        success: false,
        message: "Price must be a valid number",
      });
    }

    if (offerPrice && Number.isNaN(numericOfferPrice)) {
      return NextResponse.json({
        success: false,
        message: "Offer price must be a valid number",
      });
    }

    if (numericPrice <= 0) {
      return NextResponse.json({
        success: false,
        message: "Price must be greater than zero",
      });
    }

    if (numericOfferPrice !== null) {
      if (numericOfferPrice <= 0) {
        return NextResponse.json({
          success: false,
          message: "Offer price must be greater than zero",
        });
      }

      if (numericOfferPrice >= numericPrice) {
        return NextResponse.json({
          success: false,
          message: "Offer price must be less than the price",
        });
      }
    }

    product.name = name;
    product.description = description;
    product.category = category;
    product.price = numericPrice;
    product.offerPrice = numericOfferPrice;
    product.printfulEnabled = printfulEnabled;

    const finalImages = [...existingImages, ...uploadedImages];
    if (finalImages.length > 0) {
      product.image = finalImages;
    }

    const previousDigitalFileKey = product.digitalFileKey;
    let digitalFileKeyToDelete = null;

    if (digitalFile && typeof digitalFile.arrayBuffer === "function") {
      const { ok, error } = validateDigitalFile(digitalFile);
      if (!ok) {
        return NextResponse.json({
          success: false,
          message: error,
        });
      }
      const upload = await uploadFileToS3(digitalFile, {
        keyPrefix: `products/${userId}`,
      });
      product.digitalFileKey = upload.key;
      product.digitalFileUrl = null;
      product.digitalFileName = digitalFile.name || null;
      if (previousDigitalFileKey && previousDigitalFileKey !== upload.key) {
        digitalFileKeyToDelete = previousDigitalFileKey;
      }
    } else if (removeDigitalFile) {
      if (product.digitalFileKey) {
        digitalFileKeyToDelete = product.digitalFileKey;
      }
      product.digitalFileKey = null;
      product.digitalFileUrl = null;
      product.digitalFileName = null;
    }

    await product.save();

    if (digitalFileKeyToDelete) {
      await deleteFileFromS3(digitalFileKeyToDelete);
    }

    return NextResponse.json({ success: true, product });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message });
  }
}
