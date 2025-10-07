import mongoose from "mongoose";

const WishlistSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

WishlistSchema.index({ user: 1, product: 1 }, { unique: true });
WishlistSchema.index({ userId: 1, product: 1 }, { unique: true });

export default mongoose.models.Wishlist ||
  mongoose.model("Wishlist", WishlistSchema);
