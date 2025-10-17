import mongoose from "mongoose";
import { CATEGORIES } from "@/src/constants/categories";

const productSchema = new mongoose.Schema({
  userId: { type: String, required: true, ref: "User" },
  name: { type: String, required: true },
  description: { type: String, required: true },
  physicalPrices: {
    M: { type: Number, default: 30, min: 0.01 },
    L: { type: Number, default: 40, min: 0.01 },
    XL: { type: Number, default: 50, min: 0.01 },
  },
  physicalDiscount: { type: Number, default: 0, min: 0, max: 100 },
  digitalDiscount: { type: Number, default: 0, min: 0, max: 100 },
  digitalPrice: { type: Number, default: 6.5, min: 0 },
  price: { type: Number, default: 30, min: 0.01 },
  offerPrice: { type: Number, default: null, min: 0 },
  image: { type: [String], required: true },
  category: { type: String, required: true, enum: CATEGORIES },
  printfulEnabled: { type: Boolean, default: false, alias: "PrintfulEnabled" },
  isPrintfulEnabled: { type: Boolean, default: false },
  printfulVariantIds: {
    small_12x18: { type: Number, default: null, min: 1 },
    medium_18x24: { type: Number, default: null, min: 1 },
    large_24x36: { type: Number, default: null, min: 1 },
  },
  s3Url: { type: String, default: null },
  cdnUrl: { type: String, default: null },
  digitalFileKey: { type: String, default: null },
  digitalFileUrl: { type: String, default: null },
  digitalFileName: { type: String, default: null },
  orientation: {
    type: String,
    enum: ["portrait", "landscape"],
    default: "portrait",
  }, // NEW

  date: { type: Date, default: Date.now },
});

productSchema.pre("validate", function syncPrintfulSettings(next) {
  const currentEnabled =
    this.isPrintfulEnabled ?? this.printfulEnabled ?? false;

  if (this.printfulEnabled !== currentEnabled) {
    this.printfulEnabled = currentEnabled;
  }

  if (this.isPrintfulEnabled !== currentEnabled) {
    this.isPrintfulEnabled = currentEnabled;
  }

  if (!this.printfulVariantIds) {
    this.printfulVariantIds = {};
  }

  const variantKeys = ["small_12x18", "medium_18x24", "large_24x36"];

  for (const key of variantKeys) {
    const value = this.printfulVariantIds[key];
    if (value === "" || value === undefined) {
      this.printfulVariantIds[key] = null;
    } else if (value !== null) {
      const numeric = Number(value);
      this.printfulVariantIds[key] = Number.isFinite(numeric)
        ? numeric
        : null;
    }
  }

  if (currentEnabled) {
    const variants = this.printfulVariantIds || {};
    const allPresent = variantKeys.every(
      (key) => variants[key] !== null && variants[key] !== undefined
    );

    if (!allPresent) {
      return next(
        new Error(
          "Printful-enabled products must include variant IDs for 12×18, 18×24, and 24×36."
        )
      );
    }
  }

  return next();
});

const Product =
  mongoose.models.product || mongoose.model("product", productSchema);
export default Product;
