import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const authAdmin = async (userId) => {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);

    if (user?.publicMetadata?.role === "admin") {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message });
  }
};

export default authAdmin;
