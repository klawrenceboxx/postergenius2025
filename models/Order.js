import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, ref: "user" },
    address: { type: String, ref: "address", required: true },
    items: [
      {
        product: { type: String, ref: "product", required: true },
        quantity: { type: Number, required: true },
      },
    ],
    amount: { type: Number, required: true },
    subtotal: { type: Number, required: true },
    tax: { type: Number, required: true },
    status: { type: String, required: true, default: "Order Place" },
    date: { type: Number, required: true },
    stripeSessionId: { type: String, unique: true }, // Add this field
  },
  {
    timestamps: true,
  }
);

const Order = mongoose.models.order || mongoose.model("order", orderSchema);

export default Order;
