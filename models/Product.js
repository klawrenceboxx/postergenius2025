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
  digitalFileKey: { type: String, default: null },
  digitalFileUrl: { type: String, default: null },
  digitalFileName: { type: String, default: null },
  s3Url: { type: String, required: true },
  cdnUrl: { type: String, required: false, default: null },
  orientation: {
    type: String,
    enum: ["portrait", "landscape"],
    default: "portrait",
  }, // NEW

  date: { type: Date, default: Date.now },
});

const Product =
  mongoose.models.product || mongoose.model("product", productSchema);
export default Product;
