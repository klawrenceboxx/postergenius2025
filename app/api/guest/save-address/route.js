import connectDB from "@/config/db";
import GuestAddress from "@/models/GuestAddress";
import { NextResponse } from "next/server";
import {
  sanitizeEmail,
  sanitizeIdentifier,
  sanitizePlainText,
} from "@/lib/security/input";

const REQUIRED_FIELDS = [
  "fullName",
  "email",
  "phone",
  "street",
  "city",
  "postalCode",
  "country",
  "province",
];

function normalizeAddressPayload(addressData = {}) {
  return {
    fullName: sanitizePlainText(addressData.fullName, { maxLength: 120 }),
    email: sanitizeEmail(addressData.email),
    phone: sanitizePlainText(addressData.phone, { maxLength: 40 }),
    street: sanitizePlainText(addressData.street, { maxLength: 160 }),
    city: sanitizePlainText(addressData.city, { maxLength: 120 }),
    postalCode: sanitizePlainText(addressData.postalCode, { maxLength: 32 }),
    country: sanitizePlainText(addressData.country, { maxLength: 64 }),
    province: sanitizePlainText(addressData.province, { maxLength: 64 }),
  };
}

function validateRequestBody(body) {
  if (!body || typeof body !== "object") {
    return { valid: false, message: "Invalid request payload" };
  }

  const { guestId, addressData } = body;

  const normalizedGuestId = sanitizeIdentifier(guestId, { maxLength: 128 });

  if (!normalizedGuestId) {
    return { valid: false, message: "guestId is required" };
  }

  if (!addressData || typeof addressData !== "object") {
    return { valid: false, message: "addressData is required" };
  }

  const normalized = normalizeAddressPayload(addressData);
  const missing = REQUIRED_FIELDS.filter((field) => !normalized[field]);

  if (missing.length > 0) {
    return {
      valid: false,
      message: `Missing required fields: ${missing.join(", ")}`,
    };
  }

  return { valid: true, guestId: normalizedGuestId, address: normalized };
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { valid, message, guestId, address } = validateRequestBody(body);

    if (!valid) {
      return NextResponse.json(
        { success: false, message },
        { status: 400 }
      );
    }

    await connectDB();

    const updatedAddress = await GuestAddress.findOneAndUpdate(
      { guestId },
      { $set: { guestId, ...address } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({ success: true, address: updatedAddress });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

/**
 * Manual verification:
 * 1. Generate a guestId via the storefront (localStorage `posterGenius.guest`).
 * 2. POST to `/api/guest/save-address` with `{ guestId, addressData: { ... } }` and confirm
 *    the response contains the persisted address document.
 * 3. Inspect the `guestAddresses` collection to ensure the document is upserted per guest.
 */
