import { v2 as cloudinary } from "cloudinary";
import { getAuth } from "@clerk/nextjs/server";
import authAdmin from "@/lib/authAdmin";
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

    const isAdmin = await authAdmin(userId);
    if (isAdmin !== true) {
      return NextResponse.json({ success: false, message: "Unauthorized" });
    }

    const formData = await request.formData();

    const name = formData.get("name");
    const description = formData.get("description");
    const category = formData.get("category");
    const physicalPriceM = formData.get("physicalPriceM");
    const physicalPriceL = formData.get("physicalPriceL");
    const physicalPriceXL = formData.get("physicalPriceXL");
    const physicalDiscount = formData.get("physicalDiscount");
    const digitalDiscount = formData.get("digitalDiscount");
    const digitalPrice = formData.get("digitalPrice");
    const orientation = formData.get("orientation");
    const printfulEnabled =
      formData.get("printfulEnabled") === "true" ||
      formData.get("printfulEnabled") === "on";
    const digitalFile = formData.get("digitalFile");

    const files = (formData.getAll("images") || []).filter(
      (file) => file && typeof file.arrayBuffer === "function"
    );

    const parsePhysicalPrice = (value, fallback) => {
      if (value === null || value === undefined || value === "") {
        return { price: fallback, error: null };
      }
      const parsed = Number(value);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        return { price: fallback, error: "Physical prices must be positive numbers" };
      }
      return { price: Math.round(parsed * 100) / 100, error: null };
    };

    const mParsed = parsePhysicalPrice(physicalPriceM, 30);
    const lParsed = parsePhysicalPrice(physicalPriceL, 40);
    const xlParsed = parsePhysicalPrice(physicalPriceXL, 50);

    const physicalError = mParsed.error || lParsed.error || xlParsed.error;
    if (physicalError) {
      return NextResponse.json({ success: false, message: physicalError });
    }

    const mPrice = mParsed.price;
    const lPrice = lParsed.price;
    const xlPrice = xlParsed.price;

    const numericDigitalPrice = digitalPrice ? Number(digitalPrice) : 6.5;
    if (Number.isNaN(numericDigitalPrice) || numericDigitalPrice < 0) {
      return NextResponse.json({
        success: false,
        message: "Digital price must be zero or a positive number",
      });
    }

    const normalizeDiscount = (value) => {
      const parsed = Number(value);
      if (!Number.isFinite(parsed) || parsed < 0) return 0;
      if (parsed > 100) return 100;
      return Math.round(parsed);
    };

    const normalizedPhysicalDiscount = normalizeDiscount(physicalDiscount);
    const normalizedDigitalDiscount = normalizeDiscount(digitalDiscount);

    if (!files || files.length === 0) {
      return NextResponse.json({
        success: false,
        message: "No files uploaded",
      });
    }

    const normalizedOrientation =
      orientation === "landscape" ? "landscape" : "portrait";

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

    let digitalFileMeta = { key: null, url: null };
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
      physicalPrices: { M: mPrice, L: lPrice, XL: xlPrice },
      physicalDiscount: normalizedPhysicalDiscount,
      digitalDiscount: normalizedDigitalDiscount,
      digitalPrice: Math.round(numericDigitalPrice * 100) / 100,
      price: mPrice,
      offerPrice: null,
      image,
      printfulEnabled,
      digitalFileKey: digitalFileMeta.key,
      digitalFileUrl:
        digitalFileMeta.url ||
        (digitalFileMeta.key
          ? `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${digitalFileMeta.key}`
          : null),
      digitalFileName,
      orientation: normalizedOrientation,
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
