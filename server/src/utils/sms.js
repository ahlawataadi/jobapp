import twilio from "twilio";
import { getConfig } from "../models/AdminConfig.js";

// Sends an SMS. Uses Twilio if accountSid/authToken/fromNumber are configured
// in the admin panel (Settings > SMS gateway). Falls back to a generic HTTP
// gateway (apiUrl/apiKey with {apiKey}/{senderId}/{to}/{message} placeholders)
// if configured, otherwise logs the message.
export const sendSms = async ({ to, message }) => {
  const config = await getConfig();
  const sms = config.sms || {};

  if (sms.accountSid && sms.authToken && sms.fromNumber) {
    const client = twilio(sms.accountSid, sms.authToken);
    const result = await client.messages.create({ to, from: sms.fromNumber, body: message });
    return { sent: true, sid: result.sid };
  }

  if (sms.apiUrl && sms.apiKey) {
    const url = sms.apiUrl
      .replace("{apiKey}", encodeURIComponent(sms.apiKey))
      .replace("{senderId}", encodeURIComponent(sms.senderId || ""))
      .replace("{to}", encodeURIComponent(to))
      .replace("{message}", encodeURIComponent(message));

    const res = await fetch(url, { method: "GET" });
    return { sent: res.ok, status: res.status };
  }

  console.log(`[sms] SMS gateway not configured — would send to ${to}: ${message}`);
  return { sent: false, reason: "sms_not_configured" };
};
