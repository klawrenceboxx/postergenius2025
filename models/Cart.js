import mongoose from "mongoose";

const cartSchema = new mongoose.Schema(
  {
    userId: { type: String },
    guestId: { type: String },
    items: { type: Object, default: {} },
  },
  { minimize: false, timestamps: true }
);

cartSchema.pre("validate", function (next) {
  if (!this.userId && !this.guestId) {
    return next(new Error("userId or guestId is required"));
  }
  next();
});

const Cart = mongoose.models.cart || mongoose.model("cart", cartSchema);

export default Cart;
