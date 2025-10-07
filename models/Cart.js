import mongoose from "mongoose";

const cartSchema = new mongoose.Schema(
  {
    userId: { type: String, required: false },
    guestId: { type: String, required: false },
    items: { type: Object, default: {} },
  },
  { minimize: false, timestamps: true }
);

cartSchema.pre("validate", function (next) {
  if (!this.userId && !this.guestId) {
    return next(new Error("userId or guestId is required"));
  }

  if (this.userId && this.guestId) {
    return next(new Error("Cart cannot reference both userId and guestId"));
  }

  next();
});

cartSchema.index(
  { userId: 1 },
  { unique: true, partialFilterExpression: { userId: { $exists: true, $type: "string" } } }
);

cartSchema.index(
  { guestId: 1 },
  { unique: true, partialFilterExpression: { guestId: { $exists: true, $type: "string" } } }
);

const Cart = mongoose.models.cart || mongoose.model("cart", cartSchema);

export default Cart;

/**
 * Manual verification:
 * 1. Run `node` in the project root and `await mongoose.connect(process.env.MONGODB_URI)`.
 * 2. Create sample carts via `Cart.create({ userId: "user_123", items: {} })` and `Cart.create({ guestId: "guest_123", items: {} })`.
 * 3. Attempt to set both identifiers on a single doc to observe the validation error.
 *
 * Automated verification:
 * 1. Use Jest or your preferred runner to insert fixtures and ensure duplicate userId/guestId carts fail to save.
 */
