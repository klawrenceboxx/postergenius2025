import connectDB from "@/config/db";
import User from "@/models/User";
import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    let user = await User.findOne({ userId });

    if (!user) {
      // User exists in Clerk but not in MongoDB (e.g. Inngest webhook missed).
      // Auto-create them now so the app works immediately.
      const clerkUser = await currentUser();
      if (!clerkUser) {
        return NextResponse.json(
          { success: false, message: "Unauthorized" },
          { status: 401 }
        );
      }

      const email = clerkUser.emailAddresses?.[0]?.emailAddress ?? "";
      const name = `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim();

      user = await User.findOneAndUpdate(
        { userId },
        { userId, name, email, imageUrl: clerkUser.imageUrl ?? "" },
        { upsert: true, new: true }
      );
    }

    return NextResponse.json({ success: true, user }, { status: 200 });
  } catch (error) {
    console.error("GET /api/user/data error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
