import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "product",
      required: true,
    },
    quantity: { type: Number, required: true },
    format: {
      type: String,
      enum: ["digital", "physical"],
      default: "physical",
    },
    dimensions: { type: String },
    unitPrice: { type: Number },
    lineTotal: { type: Number },
    printfulVariantId: { type: String },
  },
  { _id: false }
);

const digitalDownloadSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "product",
    },
    url: { type: String },
    expiresAt: { type: Date },
  },
  { _id: false }
);

const orderLogSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, ref: "user" },
    // store the referenced address id as an ObjectId so populate works
    address: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "address",
      required: function () {
        return this.type === "physical";
      },
    },
    items: [orderItemSchema],
    amount: { type: Number, required: true },
    subtotal: { type: Number, required: true },
    tax: { type: Number, required: true },
    type: {
      type: String,
      enum: ["digital", "physical"],
      required: true,
      default: "digital",
    },
    status: { type: String, required: true, default: "Order Placed" },
    date: { type: Number, required: true },
    stripeSessionId: { type: String, unique: true }, // Add this field
    shippingCost: { type: Number },
    shippingCurrency: { type: String },
    shippingService: { type: String },
    shippingRateId: { type: String },
    printfulOrderId: { type: String, index: true },
    printfulStatus: { type: String },
    trackingUrl: { type: String },
    fulfillmentError: { type: String },
    digitalDownloads: [digitalDownloadSchema],
    orderLogs: {
      type: [orderLogSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

const Order = mongoose.models.order || mongoose.model("order", orderSchema);

export default Order;
