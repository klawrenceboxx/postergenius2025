import mongoose from "mongoose";

const PromoSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true },
    type: {
      type: String,
      enum: ["flat", "percent", "shipping"],
      required: true,
    },
    condition: {
      type: String,
      enum: ["none", "cartValue", "quantity"],
      default: "none",
    },
    value: { type: Number, required: true, min: 0 },
    minCartValue: { type: Number, min: 0 },
    minQuantity: { type: Number, min: 0 },
    expiresAt: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Promo = mongoose.models.Promo || mongoose.model("Promo", PromoSchema);
export default Promo;
