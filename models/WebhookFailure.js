import mongoose from "mongoose";

const webhookFailureSchema = new mongoose.Schema(
  {
    eventType: { type: String },
    rawBody: { type: String, required: true },
    errorMessage: { type: String, required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

const WebhookFailure =
  mongoose.models.webhookfailure ||
  mongoose.model("webhookfailure", webhookFailureSchema);

export default WebhookFailure;
