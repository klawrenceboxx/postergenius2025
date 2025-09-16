import { Inngest } from "inngest";
import connectDB from "./db";
import User from "@/models/User";
import Order from "@/models/Order";
import mongoose from "mongoose";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "postergenius-next" });

// Innjest Function to save user data to a database
export const syncUserCreation = inngest.createFunction(
  { id: "sync-user-data" },
  { event: "clerk/user.created" },
  async ({ event }) => {
    const { id, first_name, last_name, email_addresses, image_url } =
      event.data;
    const userData = {
      _id: id,
      name: `${first_name}  ${last_name}`,
      email: email_addresses[0].email_address,
      imageUrl: image_url,
    };
    await connectDB();
    await User.create(userData);
  }
);

// Inngest Function to update user data in database
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
    await User.findByIdAndUpdate(id, userData, userData);
  }
);

//Inngest Function to delete user data from database
export const syncUserDeletion = inngest.createFunction(
  { id: "delete-user-with-clerk" },
  { event: "clerk/user.deleted" },
  async ({ event }) => {
    const { id } = event.data;
    await connectDB();
    await User.findByIdAndDelete(id);
  }
);

// Inngest Function to create user's order in database
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
    const orders = events.map((event) => {
      const addr = event.data.address;
      const valid = mongoose.Types.ObjectId.isValid(addr);
      console.log(
        `Creating order for user ${event.data.userId} with address ${addr} (valid: ${valid})`
      );
      if (!valid) {
        throw new Error(`Invalid address id: ${addr}`);
      }
      return {
        userId: event.data.userId,
        address: addr,
        items: event.data.items,
        subtotal: event.data.subtotal,
        tax: event.data.tax,
        amount: event.data.amount,
        date: event.data.date,
      };
    });

    await connectDB();
    await Order.insertMany(orders);
    return {
      success: true,
      processed: orders.length,
      message: "Orders created successfully",
    };
  }
);
