import mongoose from "mongoose";

const wishlistItemSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const wishlistSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    items: { type: [wishlistItemSchema], default: [] },
  },
  { timestamps: true }
);

const Wishlist =
  mongoose.models.wishlist || mongoose.model("wishlist", wishlistSchema);

export default Wishlist;
