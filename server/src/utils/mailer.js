import nodemailer from "nodemailer";
import { getConfig } from "../models/AdminConfig.js";

// Sends an email using the SMTP settings configured in the admin panel.
// Falls back to logging the message to the console if SMTP isn't configured,
// so the rest of the app still works during local development/demos.
export const sendMail = async ({ to, subject, html, text }) => {
  const config = await getConfig();
  const smtp = config.smtp || {};

  if (!smtp.host || !smtp.user || !smtp.pass) {
    console.log(`[mailer] SMTP not configured — would send to ${to}: ${subject}`);
    return { sent: false, reason: "smtp_not_configured" };
  }

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port || 587,
    secure: !!smtp.secure,
    auth: { user: smtp.user, pass: smtp.pass },
  });

  const from = smtp.fromEmail
    ? `"${smtp.fromName || "Haryana Job Marketplace"}" <${smtp.fromEmail}>`
    : smtp.user;

  await transporter.sendMail({ from, to, subject, html, text });
  return { sent: true };
};
