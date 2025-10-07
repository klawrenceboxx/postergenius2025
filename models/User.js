import mongoose from "mongoose";

const wishlistItemSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema(
  {
    // Clerk user id (string) stored separately and uniquely
    userId: { type: String, required: true, unique: true },

    name: { type: String, required: true },
    email: { type: String, required: true },
    imageUrl: { type: String, required: true },

    // cart supports both numeric quantities and object line items
    cartItems: { type: mongoose.Schema.Types.Mixed, default: {} },

    // ✅ embed wishlist items here
    wishlist: { type: [wishlistItemSchema], default: [] },
  },
  { minimize: false }
);

export default mongoose.models.User || mongoose.model("User", UserSchema);
