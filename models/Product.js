import mongoose from "mongoose";
import { CATEGORIES } from "@/src/constants/categories";

const productSchema = new mongoose.Schema({
  userId: { type: String, required: true, ref: "User" },
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true, min: 0.01 },
  offerPrice: { type: Number, default: null, min: 0 },
  digitalPrice: { type: Number, default: 0, min: 0 },
  image: { type: [String], required: true },
  category: { type: String, required: true, enum: CATEGORIES },
  printfulEnabled: { type: Boolean, default: false, alias: "PrintfulEnabled" },
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

const Product =
  mongoose.models.product || mongoose.model("product", productSchema);
export default Product;
