import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    // Clerk provides string-based user IDs, so keep this as a string
    userId: {
      type: String,
      ref: "user",
      required: function () {
        return !this.guestId;
      },
    },
    guestId: {
      type: String,
      required: function () {
        return !this.userId;
      },
    },
    // store the referenced address id as an ObjectId so populate works
    address: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "address",
      required: function () {
        return !this.guestAddress;
      },
    },
    // Embedded address info for guest checkouts
    guestAddress: {
      fullName: String,
      phoneNumber: String,
      pincode: String,
      area: String,
      city: String,
      state: String,
      email: String,
    },
    items: [
      {
        product: { type: String, ref: "product", required: true },
        quantity: { type: Number, required: true },
      },
    ],
    amount: { type: Number, required: true },
    subtotal: { type: Number, required: true },
    tax: { type: Number, required: true },
    status: { type: String, required: true, default: "Order Placed" },
    date: { type: Number, required: true },
    stripeSessionId: { type: String, unique: true }, // Add this field
  },
  {
    timestamps: true,
  }
);

// Ensure required combinations of fields exist
orderSchema.pre("validate", function (next) {
  if (!this.userId && !this.guestId) {
    return next(new Error("userId or guestId is required"));
  }
  if (!this.address && !this.guestAddress) {
    return next(new Error("address or guestAddress is required"));
  }
  next();
});

const Order = mongoose.models.order || mongoose.model("order", orderSchema);

export default Order;
