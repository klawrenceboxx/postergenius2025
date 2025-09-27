import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      trim: true,
      index: true,
      default: null,
      validate: {
        validator(value) {
          if (this.userId) {
            return typeof value === "string" && value.trim().length > 0;
          }
          return value === null || typeof value === "string";
        },
        message: "Product ID is required for customer reviews",
      },
    },
    userId: {
      type: String,
      default: null,
      index: true,
    },
    username: {
      type: String,
      trim: true,
      required: [
        function () {
          return !this.userId;
        },
        "Username is required",
      ],
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    comment: {
      type: String,
      trim: true,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

reviewSchema.index(
  { productId: 1, userId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      productId: { $type: "string" },
      userId: { $type: "string" },
    },
  }
);

const Review = mongoose.models.Review || mongoose.model("Review", reviewSchema);

export default Review;
