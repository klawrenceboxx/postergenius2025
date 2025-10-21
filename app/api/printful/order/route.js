import { NextResponse } from "next/server";
import { submitStaticPrintfulOrder } from "@/lib/printful-static-order";

export async function POST() {
  try {
    const data = await submitStaticPrintfulOrder();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const status = error.status || 500;
    const message = error.message || "Unable to create Printful order";
    return NextResponse.json(
      {
        success: false,
        message,
        details: error.details || undefined,
      },
      { status }
    );
  }
}
