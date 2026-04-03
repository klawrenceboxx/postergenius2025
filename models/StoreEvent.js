import mongoose from "mongoose";

const storeEventSchema = new mongoose.Schema(
  {
    eventType: {
      type: String,
      required: true,
      enum: [
        "product_view",
        "wishlist_added",
        "wishlist_removed",
        "cart_added",
        "cart_quantity_updated",
        "cart_removed",
        "checkout_started",
        "purchase_completed",
      ],
    },
    productId: { type: String, index: true },
    userId: { type: String, index: true },
    guestId: { type: String, index: true },
    sessionKey: { type: String, index: true },
    orderId: { type: String, index: true },
    stripeSessionId: { type: String, index: true },
    format: { type: String },
    dimensions: { type: String },
    quantity: { type: Number, default: 1 },
    unitPrice: { type: Number, default: 0 },
    lineTotal: { type: Number, default: 0 },
    currency: { type: String, default: "cad" },
    source: { type: String, default: "web" },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    minimize: false,
  }
);

storeEventSchema.index({ eventType: 1, createdAt: -1 });
storeEventSchema.index({ productId: 1, eventType: 1, createdAt: -1 });
storeEventSchema.index({ sessionKey: 1, eventType: 1, createdAt: -1 });

const StoreEvent =
  mongoose.models.store_event || mongoose.model("store_event", storeEventSchema);

export default StoreEvent;
