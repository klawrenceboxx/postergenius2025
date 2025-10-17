import { v2 as cloudinary } from "cloudinary";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import authAdmin from "@/lib/authAdmin";
import connectDB from "@/config/db";
import Product from "@/models/Product";
import { uploadFileToS3, deleteFileFromS3 } from "@/lib/s3";
import { validateDigitalFile } from "@/lib/digitalFiles";
import { toCdnUrl } from "@/lib/cdn";

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

const buildS3PublicUrl = (key) => {
  if (!key) return null;
  const bucket = process.env.S3_BUCKET_NAME;
  const region = process.env.AWS_REGION;
  if (!bucket || !region) return null;
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
};

export async function GET(request, { params }) {
  try {
    const { userId } = getAuth(request);
    const isAdmin = await authAdmin(userId);

    if (isAdmin !== true) {
      return NextResponse.json({ success: false, message: "Unauthorized" });
    }

    await connectDB();

    const product = await Product.findById(params.id);
    if (!product) {
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
    if (!product) {
      return NextResponse.json({ success: false, message: "Product not found" });
    }

    if (!name || !description || !category) {
      return NextResponse.json({
        success: false,
        message: "Missing required fields",
      });
    }

    const parsePhysicalPrice = (value, fallback) => {
      if (value === null || value === undefined || value === "") {
        return { price: fallback, error: null };
      }
      const parsed = Number(value);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        return {
          price: fallback,
          error: "Physical prices must be positive numbers",
        };
      }
      return { price: Math.round(parsed * 100) / 100, error: null };
    };

    const mParsed = parsePhysicalPrice(physicalPriceM, product.physicalPrices?.M ?? 30);
    const lParsed = parsePhysicalPrice(physicalPriceL, product.physicalPrices?.L ?? 40);
    const xlParsed = parsePhysicalPrice(
      physicalPriceXL,
      product.physicalPrices?.XL ?? 50
    );

    const physicalError = mParsed.error || lParsed.error || xlParsed.error;
    if (physicalError) {
      return NextResponse.json({ success: false, message: physicalError });
    }

    const mPrice = mParsed.price;
    const lPrice = lParsed.price;
    const xlPrice = xlParsed.price;

    const normalizedDigitalPrice =
      digitalPrice !== null && digitalPrice !== undefined && digitalPrice !== ""
        ? Number(digitalPrice)
        : product.digitalPrice ?? 6.5;

    if (Number.isNaN(normalizedDigitalPrice)) {
      return NextResponse.json({
        success: false,
        message: "Digital price must be a valid number",
      });
    }

    if (normalizedDigitalPrice < 0) {
      return NextResponse.json({
        success: false,
        message: "Digital price must be zero or a positive number",
      });
    }

    const normalizeDiscount = (value, fallback = 0) => {
      if (value === null || value === undefined || value === "") {
        return fallback;
      }
      const parsed = Number(value);
      if (!Number.isFinite(parsed) || parsed < 0) return 0;
      if (parsed > 100) return 100;
      return Math.round(parsed);
    };

    const normalizedPhysicalDiscount = normalizeDiscount(
      physicalDiscount,
      product.physicalDiscount ?? 0
    );
    const normalizedDigitalDiscount = normalizeDiscount(
      digitalDiscount,
      product.digitalDiscount ?? 0
    );

    const normalizedOrientation =
      orientation === "landscape" ? "landscape" : "portrait";

    product.name = name;
    product.description = description;
    product.category = category;
    product.physicalPrices = { M: mPrice, L: lPrice, XL: xlPrice };
    product.physicalDiscount = normalizedPhysicalDiscount;
    product.digitalDiscount = normalizedDigitalDiscount;
    product.price = mPrice;
    product.offerPrice = null;
    product.printfulEnabled = printfulEnabled;
    product.digitalPrice = Math.round(normalizedDigitalPrice * 100) / 100;
    product.orientation = normalizedOrientation;

    const finalImages = [...existingImages, ...uploadedImages];
    if (finalImages.length > 0) {
      product.image = finalImages;
    }

    const previousDigitalFileKey = product.digitalFileKey;
    let digitalFileKeyToDelete = null;

    const ownerId =
      product.userId?.toString?.() ?? product.userId ?? userId ?? "unknown";

    if (digitalFile && typeof digitalFile.arrayBuffer === "function") {
      const { ok, error } = validateDigitalFile(digitalFile);
      if (!ok) {
        return NextResponse.json({
          success: false,
          message: error,
        });
      }
      const upload = await uploadFileToS3(digitalFile, {
        keyPrefix: `products/${ownerId}`,
      });
      const fallbackS3Url =
        upload.url || buildS3PublicUrl(upload.key) || null;

      if (!fallbackS3Url) {
        return NextResponse.json({
          success: false,
          message: "Failed to determine the S3 location for the uploaded file.",
        });
      }

      const derivedCdnUrl = toCdnUrl(fallbackS3Url);
      if (!derivedCdnUrl) {
        return NextResponse.json({
          success: false,
          message: "Failed to derive the CloudFront URL for the uploaded file.",
        });
      }
      product.digitalFileKey = upload.key;
      product.digitalFileUrl = fallbackS3Url;
      product.digitalFileName = digitalFile.name || null;
      product.s3Url = fallbackS3Url;
      product.cdnUrl = derivedCdnUrl;
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
      product.s3Url = "";
      product.cdnUrl = null;
    }

    if (!product.s3Url) {
      const fallbackExistingUrl =
        product.digitalFileUrl || buildS3PublicUrl(product.digitalFileKey);
      if (fallbackExistingUrl) {
        product.s3Url = fallbackExistingUrl;
        product.cdnUrl = toCdnUrl(fallbackExistingUrl);
      }
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

export async function DELETE(request, { params }) {
  try {
    const { userId } = getAuth(request);
    const isAdmin = await authAdmin(userId);

    if (isAdmin !== true) {
      return NextResponse.json({ success: false, message: "Unauthorized" });
    }

    await connectDB();

    const product = await Product.findById(params.id);
    if (!product) {
      return NextResponse.json({ success: false, message: "Product not found" });
    }

    const digitalFileKey = product.digitalFileKey;

    await product.deleteOne();

    if (digitalFileKey) {
      await deleteFileFromS3(digitalFileKey);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message });
  }
}
