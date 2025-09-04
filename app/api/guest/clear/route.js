import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  cookies().set("gid", "", { httpOnly: true, secure: true, path: "/", maxAge: 0 });
  return NextResponse.json({ success: true });
}
