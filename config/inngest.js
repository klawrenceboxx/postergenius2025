import { Inngest } from "inngest";
import connectDB from "./db";
import User from "@/models/User";
import Order from "@/models/Order";
import mongoose from "mongoose";

export const inngest = new Inngest({ id: "postergenius-next" });

// Clerk sync functions (no change)
export const syncUserCreation = inngest.createFunction(
  { id: "sync-user-data" },
  { event: "clerk/user.created" },
  async ({ event }) => {
    const { id, first_name, last_name, email_addresses, image_url } =
      event.data;
    const userData = {
      userId: id,
      name: `${first_name} ${last_name}`,
      email: email_addresses[0].email_address,
      imageUrl: image_url,
    };
    await connectDB();
    await User.findOneAndUpdate({ userId: id }, userData, {
      upsert: true,
      new: true,
    });
  }
);

export const syncUserUpdation = inngest.createFunction(
  { id: "update-user-from-clerk" },
  { event: "clerk/user.updated" },
  async ({ event }) => {
    const { id, first_name, last_name, email_addresses, image_url } =
      event.data;
    const userData = {
      name: `${first_name} ${last_name}`,
      email: email_addresses[0].email_address,
      imageUrl: image_url,
    };
    await connectDB();
    await User.findOneAndUpdate({ userId: id }, userData, { new: true });
  }
);

export const syncUserDeletion = inngest.createFunction(
  { id: "delete-user-with-clerk" },
  { event: "clerk/user.deleted" },
  async ({ event }) => {
    const { id } = event.data;
    await connectDB();
    await User.findOneAndDelete({ userId: id });
  }
);

// ✅ FIXED createUserOrder
export const createUserOrder = inngest.createFunction(
  {
    id: "create-user-order",
    batchEvents: {
      maxSize: 5,
      timeout: "5s",
    },
  },
  { event: "order/created" },
  async ({ events }) => {
    console.log(
      "[DEBUG] Incoming order events:",
      JSON.stringify(events, null, 2)
    );

    const orders = events.map((event) => {
      const {
        userId,
        address,
        items,
        subtotal,
        tax,
        amount,
        date,
        stripeSessionId,
      } = event.data;

      const valid = mongoose.Types.ObjectId.isValid(address);
      if (!valid) {
        console.error("[ERROR] Invalid address ID:", address);
        throw new Error(`Invalid address id: ${address}`);
      }

      // ✅ Ensure product gets mapped correctly
      const fixedItems = items.map((item, i) => {
        const productId = item.productId || item.product; // accept either key
        if (!productId) {
          console.error(`[ERROR] Missing product ID for item[${i}]`, item);
          throw new Error(`Missing product ID for item[${i}]`);
        }
        return {
          product: productId,
          quantity: item.quantity,
        };
      });

      console.log("[DEBUG] Processed order items:", fixedItems);

      return {
        userId,
        address,
        items: fixedItems,
        subtotal,
        tax,
        amount,
        date,
        stripeSessionId: stripeSessionId || null,
      };
    });

    await connectDB();
    const result = await Order.insertMany(orders);
    console.log("[DEBUG] Orders saved:", result);

    return {
      success: true,
      processed: orders.length,
      message: "Orders created successfully",
    };
  }
);
