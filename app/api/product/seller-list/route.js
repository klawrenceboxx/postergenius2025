import connectDB from "@/config/db";
import authAdmin from "@/lib/authAdmin";
import Product from "@/models/Product";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    // Authenticate the admin user
    const { userId } = getAuth(request);

    const isAdmin = await authAdmin(userId);

    if (isAdmin !== true) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    const products = await Product.find({}).sort({ date: -1 });
    return NextResponse.json({ success: true, products });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message });
  }
}
