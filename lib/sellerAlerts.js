import nodemailer from "nodemailer";

function getTransportConfig() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    return null;
  }

  return {
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  };
}

export async function sendPurchaseAlertEmail({
  order,
  purchasedItems = [],
  customerLabel,
}) {
  const transportConfig = getTransportConfig();
  if (!transportConfig) {
    return { sent: false, reason: "smtp_not_configured" };
  }

  const recipient =
    process.env.ANALYTICS_ALERT_EMAIL ||
    process.env.CONTACT_RECIPIENT_EMAIL ||
    process.env.SMTP_USER;

  if (!recipient) {
    return { sent: false, reason: "recipient_not_configured" };
  }

  const transporter = nodemailer.createTransport(transportConfig);
  const lines = purchasedItems.length
    ? purchasedItems.map((item) => {
        const segments = [
          item.name || "Unknown product",
          `qty ${item.quantity || 1}`,
        ];
        if (item.format) segments.push(item.format);
        if (item.dimensions) segments.push(item.dimensions);
        return `- ${segments.join(" | ")}`;
      })
    : ["- No item details available"];

  await transporter.sendMail({
    from: `PosterGenius Alerts <${process.env.SMTP_USER}>`,
    to: recipient,
    subject: `New purchase: ${lines[0]?.replace(/^- /, "") || "PosterGenius order"}`,
    text: [
      "A new store purchase was completed.",
      "",
      `Order ID: ${order?._id || "unknown"}`,
      `Stripe Session: ${order?.stripeSessionId || "unknown"}`,
      `Customer: ${customerLabel || "Unknown"}`,
      `Order Type: ${order?.type || "unknown"}`,
      `Amount: ${Number(order?.amount || 0).toFixed(2)} ${String(
        order?.shippingCurrency || "CAD"
      ).toUpperCase()}`,
      "",
      "Items:",
      ...lines,
    ].join("\n"),
  });

  return { sent: true };
}
