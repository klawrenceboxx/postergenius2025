import { NextResponse } from "next/server";
import { submitStaticPrintfulOrder } from "@/lib/printful-static-order";

export async function POST() {
  try {
    const data = await submitStaticPrintfulOrder();
    return NextResponse.json(data);
  } catch (error) {
    const status = error.status || 500;
    const message = error.message || "Failed to submit static Printful order";
    const details = error.details;
    return NextResponse.json(
      { error: message, details: details || undefined },
      { status }
    );
  }
}
