import { NextResponse } from "next/server";
import { sanitizeEmail, sanitizePlainText } from "@/lib/security/input";

export async function POST(request) {
  try {
    const body = await request.json();
    const email = sanitizeEmail(body?.email);
    const source =
      sanitizePlainText(body?.source || "website-popup", { maxLength: 64 }) ||
      "website-popup";

    if (!email) {
      return NextResponse.json(
        { success: false, message: "A valid email address is required." },
        { status: 400 }
      );
    }

    const apiKey = process.env.OMNISEND_API_KEY;
    if (!apiKey) {
      console.error("[omnisend/subscribe] OMNISEND_API_KEY is not set");
      return NextResponse.json(
        { success: false, message: "Email service is not configured." },
        { status: 500 }
      );
    }

    const omnisendResponse = await fetch("https://api.omnisend.com/v5/contacts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey,
      },
      body: JSON.stringify({
        email,
        status: "subscribed",
        statusDate: new Date().toISOString(),
        tags: [source],
        sendWelcomeEmail: true,
      }),
    });

    // 200 = created, 204 = updated (already exists) — both are success
    if (omnisendResponse.ok || omnisendResponse.status === 204) {
      return NextResponse.json({ success: true });
    }

    // 409 means contact already exists and is subscribed — treat as success
    if (omnisendResponse.status === 409) {
      return NextResponse.json({ success: true });
    }

    const errorBody = await omnisendResponse.text();
    console.error(
      `[omnisend/subscribe] Omnisend API error ${omnisendResponse.status}:`,
      errorBody
    );

    return NextResponse.json(
      { success: false, message: "Failed to subscribe. Please try again." },
      { status: 502 }
    );
  } catch (error) {
    console.error("[omnisend/subscribe] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
