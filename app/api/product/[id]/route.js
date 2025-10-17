import { v2 as cloudinary } from "cloudinary";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import authAdmin from "@/lib/authAdmin";
import connectDB from "@/config/db";
import Product from "@/models/Product";
import { uploadFileToS3, deleteFileFromS3 } from "@/lib/s3";
import { validateDigitalFile } from "@/lib/digitalFiles";
import { PRINTFUL_POSTER_VARIANTS } from "@/config/printfulVariants";

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
    const rawPrintfulEnabled =
      formData.get("printfulEnabled") === "true" ||
      formData.get("printfulEnabled") === "on";
    const rawIsPrintfulEnabled =
      formData.get("isPrintfulEnabled") === "true" ||
      formData.get("isPrintfulEnabled") === "on";
    const printfulEnabled = rawPrintfulEnabled || rawIsPrintfulEnabled;
    const variantIdsRaw = formData.get("printfulVariantIds");
    const coerceVariantId = (value) => {
      if (value === undefined || value === null || value === "") return null;
      const numeric = Number(value);
      if (!Number.isFinite(numeric) || numeric <= 0) {
        return null;
      }
      return numeric;
    };
    let printfulVariantIds = {
      small_12x18: null,
      medium_18x24: null,
      large_24x36: null,
    };

    const defaultPosterVariants = {
      small_12x18: coerceVariantId(PRINTFUL_POSTER_VARIANTS["12x18"]),
      medium_18x24: coerceVariantId(PRINTFUL_POSTER_VARIANTS["18x24"]),
      large_24x36: coerceVariantId(PRINTFUL_POSTER_VARIANTS["24x36"]),
    };

    if (variantIdsRaw) {
      try {
        const parsed = JSON.parse(variantIdsRaw);
        if (parsed && typeof parsed === "object") {
          printfulVariantIds = {
            small_12x18: coerceVariantId(parsed.small_12x18),
            medium_18x24: coerceVariantId(parsed.medium_18x24),
            large_24x36: coerceVariantId(parsed.large_24x36),
          };
        }
      } catch (error) {
        console.warn("Failed to parse printfulVariantIds", error);
      }
    }
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

    const fallbackVariants = product.printfulVariantIds || {};
    printfulVariantIds = {
      small_12x18:
        printfulVariantIds.small_12x18 ?? coerceVariantId(fallbackVariants.small_12x18),
      medium_18x24:
        printfulVariantIds.medium_18x24 ?? coerceVariantId(fallbackVariants.medium_18x24),
      large_24x36:
        printfulVariantIds.large_24x36 ?? coerceVariantId(fallbackVariants.large_24x36),
    };

    printfulVariantIds = {
      small_12x18:
        printfulVariantIds.small_12x18 ?? defaultPosterVariants.small_12x18,
      medium_18x24:
        printfulVariantIds.medium_18x24 ?? defaultPosterVariants.medium_18x24,
      large_24x36:
        printfulVariantIds.large_24x36 ?? defaultPosterVariants.large_24x36,
    };

    if (printfulEnabled) {
      const missingVariant = Object.entries(printfulVariantIds).find(
        ([, value]) => value === null
      );
      if (missingVariant) {
        return NextResponse.json({
          success: false,
          message:
            "Printful variant IDs for 12×18, 18×24, and 24×36 are required when Printful integration is enabled.",
        });
      }
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
    product.isPrintfulEnabled = printfulEnabled;
    product.printfulVariantIds = printfulVariantIds;
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
      product.digitalFileKey = upload.key;
      product.digitalFileUrl =
        upload.url || buildS3PublicUrl(upload.key) || null;
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
