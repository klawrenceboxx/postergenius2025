import mongoose from "mongoose";

const guestAddressSchema = new mongoose.Schema(
  {
    guestId: { type: String, required: true, unique: true, index: true },
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    street: { type: String, required: true },
    city: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true },
    province: { type: String, required: true },
  },
  { timestamps: true }
);

const GuestAddress =
  mongoose.models.GuestAddress ||
  mongoose.model("GuestAddress", guestAddressSchema);

export default GuestAddress;
