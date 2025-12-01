// import connectDB from "@/config/db";
// import User from "@/models/User";
// import { getAuth } from "@clerk/nextjs/server";
// import { NextResponse } from "next/server";

// export async function GET(request) {
//   try {
//     const { userId } = getAuth(request);

//     await connectDB();
//     const user = await User.findOne({ userId });

//     if (!user) {
//       return NextResponse.json({ success: false, message: "User not found" });
//     }

//     return NextResponse.json({ success: true, user });
//   } catch (error) {
//     return NextResponse.json({ success: false, message: error.message });
//   }
// }
export const runtime = "nodejs";

import connectDB from "@/config/db";
import User from "@/models/User";
import { getAuth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { userId } = getAuth(request);
    console.log("USER ID FROM CLERK:", userId);

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    let user = await User.findOne({ userId });

    // ✅ AUTO-CREATE USER IF MISSING
    if (!user) {
      const clerkUser = await clerkClient.users.getUser(userId);

      user = await User.create({
        userId,
        name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim(),
        email: clerkUser.emailAddresses?.[0]?.emailAddress,
        imageUrl: clerkUser.imageUrl,
        wishlist: [],
        cart: [],
      });
    }

    return NextResponse.json({ success: true, user });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
