import connectDB from "@/config/db";
import User from "@/models/User";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { userId } = getAuth(request);

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    let user = await User.findOne({ userId });

    // 🔹 Inngest hasn't finished creating the user yet
    if (!user) {
      return NextResponse.json(
        { success: false, status: "pending" },
        { status: 202 }
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
