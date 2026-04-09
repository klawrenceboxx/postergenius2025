import { NextResponse } from "next/server";

export async function POST(request) {
  void request;
  return NextResponse.json(
    {
      success: false,
      message:
        "This guest lookup route has been retired. Use /api/order/access with email and order number instead.",
    },
    { status: 410 }
  );
}
