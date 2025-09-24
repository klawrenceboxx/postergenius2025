import { v2 as cloudinary } from "cloudinary";
import { getAuth } from "@clerk/nextjs/server";
import authSeller from "@/lib/authSeller";
import connectDB from "@/config/db";
import Product from "@/models/Product";
import { NextResponse } from "next/server";
import { uploadFileToS3 } from "@/lib/s3";
import { validateDigitalFile } from "@/lib/digitalFiles";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request) {
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

    const files = (formData.getAll("images") || []).filter(
      (file) => file && typeof file.arrayBuffer === "function"
    );

    const numericPrice = Number(price);
    const numericOfferPrice = offerPrice ? Number(offerPrice) : null;

    if (Number.isNaN(numericPrice)) {
      return NextResponse.json({
        success: false,
        message: "Price must be a valid number",
      });
    }

    if (numericPrice <= 0) {
      return NextResponse.json({
        success: false,
        message: "Price must be greater than zero",
      });
    }

    if (offerPrice && Number.isNaN(numericOfferPrice)) {
      return NextResponse.json({
        success: false,
        message: "Offer price must be a valid number",
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

    if (!files || files.length === 0) {
      return NextResponse.json({
        success: false,
        message: "No files uploaded",
      });
    }

    const result = await Promise.all(
      files.map(async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { resource_type: "auto" },
            (error, result) => {
              if (error) {
                reject(error);
              } else {
                resolve(result);
              }
            }
          );
          stream.end(buffer);
        });
      })
    );

    const image = result.map((result) => result.secure_url);

    let digitalFileMeta = { key: null };
    let digitalFileName = null;

    if (digitalFile && typeof digitalFile.arrayBuffer === "function") {
      const { ok, error } = validateDigitalFile(digitalFile);
      if (!ok) {
        return NextResponse.json({
          success: false,
          message: error,
        });
      }
      digitalFileMeta = await uploadFileToS3(digitalFile, {
        keyPrefix: `products/${userId}`,
      });
      digitalFileName = digitalFile.name || null;
    }

    // Save product
    await connectDB();
    const newProduct = await Product.create({
      userId,
      name,
      description,
      category,
      price: numericPrice,
      offerPrice: numericOfferPrice,
      image,
      printfulEnabled,
      digitalFileKey: digitalFileMeta.key,
      digitalFileUrl:
        digitalFileMeta.url ||
        `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${digitalFileMeta.key}`,
      digitalFileName,
      date: Date.now(),
    });

    return NextResponse.json({
      success: true,
      message: "Product added successfully",
      newProduct,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error.message,
    });
  }
}
