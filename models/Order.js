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
    userId: { type: String, ref: "user" },
    guestId: { type: String },
    // store the referenced address id as an ObjectId so populate works
    address: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "address",
      required: function () {
        return this.type === "physical";
      },
    },
    items: [orderItemSchema],
    cartSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    shippingAddressSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    amount: { type: Number },
    subtotal: { type: Number },
    tax: { type: Number },
    totalPrice: { type: Number, default: 0 },
    shippingPrice: { type: Number, default: 0 },
    taxPrice: { type: Number, default: 0 },
    type: {
      type: String,
      enum: ["digital", "physical"],
      default: "digital",
    },
    status: { type: String, required: true, default: "Order Placed" },
    date: { type: Number },
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

orderSchema.pre("validate", function (next) {
  if (!this.userId && !this.guestId) {
    return next(new Error("Order must reference a userId or guestId"));
  }

  if (this.userId && this.guestId) {
    return next(new Error("Order cannot reference both userId and guestId"));
  }

  if (!this.date) {
    this.date = Date.now();
  }

  if (!this.totalPrice && typeof this.amount === "number") {
    this.totalPrice = this.amount;
  }

  if (!this.taxPrice && typeof this.tax === "number") {
    this.taxPrice = this.tax;
  }

  next();
});

orderSchema.index(
  { userId: 1 },
  {
    unique: false,
    partialFilterExpression: {
      userId: { $exists: true, $type: "string" },
    },
  }
);

orderSchema.index(
  { guestId: 1 },
  {
    unique: false,
    partialFilterExpression: {
      guestId: { $exists: true, $type: "string" },
    },
  }
);

const Order = mongoose.models.order || mongoose.model("order", orderSchema);

export default Order;
