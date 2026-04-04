import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import {
  sanitizeEmail,
  sanitizeMultilineText,
  sanitizePlainText,
} from "@/lib/security/input";

const REQUIRED_FIELDS = ["name", "email", "message"];

export async function POST(request) {
  try {
    const body = await request.json();
    const payload = {
      name: sanitizePlainText(body?.name, { maxLength: 120 }),
      email: sanitizeEmail(body?.email),
      message: sanitizeMultilineText(body?.message, { maxLength: 4000 }),
    };
    const missingField = REQUIRED_FIELDS.find((field) => !payload?.[field]);

    if (missingField) {
      return NextResponse.json(
        {
          success: false,
          message: `Missing required field: ${missingField}`,
        },
        { status: 400 }
      );
    }

    const {
      SMTP_HOST,
      SMTP_PORT,
      SMTP_USER,
      SMTP_PASS,
      CONTACT_RECIPIENT_EMAIL,
    } = process.env;

    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
      return NextResponse.json(
        {
          success: false,
          message: "Email service is not configured.",
        },
        { status: 500 }
      );
    }

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: Number(SMTP_PORT) === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    const recipient = CONTACT_RECIPIENT_EMAIL || SMTP_USER;

    await transporter.sendMail({
      from: `PosterGenius Contact <${SMTP_USER}>`,
      to: recipient,
      replyTo: payload.email,
      subject: `New contact form submission from ${payload.name}`,
      text: `Name: ${payload.name}\nEmail: ${payload.email}\n\nMessage:\n${payload.message}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to send contact email", error);
    return NextResponse.json(
      {
        success: false,
        message: "Unable to send message at this time.",
      },
      { status: 500 }
    );
  }
}
