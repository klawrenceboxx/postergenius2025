import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  userId: { type: String, required: true, ref: "User" },
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  offerPrice: { type: Number, default: null },
  digitalPrice: { type: Number, default: 0 },
  image: { type: [String], required: true },
  category: { type: String, required: true },
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
