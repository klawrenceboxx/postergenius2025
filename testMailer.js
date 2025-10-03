require("dotenv").config();
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

transporter
  .sendMail({
    from: `"Test" <${process.env.SMTP_USER}>`,
    to: process.env.SMTP_USER,
    subject: "SMTP Test",
    text: "If you get this, SMTP is working!",
  })
  .then((info) => console.log("✅ Sent:", info.response))
  .catch((err) => console.error("❌ Error:", err));
