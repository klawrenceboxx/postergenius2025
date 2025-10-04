import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

const REQUIRED_FIELDS = ["name", "email", "message"];
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 3;
const submissionTracker = new Map();

const sanitizeEmail = (value) => value?.trim().toLowerCase() || "";

function getClientIp(request) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  return request.ip || "unknown";
}

function isRateLimited(key) {
  if (!key) {
    return false;
  }

  const now = Date.now();
  const recentRequests = (submissionTracker.get(key) || []).filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS
  );

  if (recentRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
    submissionTracker.set(key, recentRequests);
    return true;
  }

  recentRequests.push(now);
  submissionTracker.set(key, recentRequests);
  return false;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const missingField = REQUIRED_FIELDS.find((field) => !body?.[field]);

    if (missingField) {
      return NextResponse.json(
        {
          success: false,
          message: `Missing required field: ${missingField}`,
        },
        { status: 400 }
      );
    }

    const clientIp = getClientIp(request);
    const normalizedEmail = sanitizeEmail(body.email);

    if (
      isRateLimited(`ip:${clientIp}`) ||
      isRateLimited(`email:${normalizedEmail}`)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Too many messages received. Please wait a little while before trying again.",
        },
        { status: 429 }
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
      replyTo: body.email,
      subject: `New contact form submission from ${body.name}`,
      text: `Name: ${body.name}\nEmail: ${body.email}\n\nMessage:\n${body.message}`,
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
