import crypto from "crypto";
import { sendMail } from "./mailer.js";
import { sendSms } from "./sms.js";

const OTP_TTL_MS = 10 * 60 * 1000;

export const hashOtp = (code) => crypto.createHash("sha256").update(code).digest("hex");

export const generateAndSendOtp = async (user, channel) => {
  const code = String(crypto.randomInt(100000, 1000000));
  user.otpHash = hashOtp(code);
  user.otpExpires = Date.now() + OTP_TTL_MS;
  user.otpChannel = channel;
  await user.save();

  if (channel === "phone") {
    const { sent } = await sendSms({ to: user.phone, message: `Your Haryana Job Marketplace verification code is ${code}. It expires in 10 minutes.` });
    return { sent, code };
  }

  const { sent } = await sendMail({
    to: user.email,
    subject: "Your verification code — Haryana Job Marketplace",
    html: `<p>Hi ${user.name || ""},</p><p>Your verification code is:</p><p style="font-size:24px;font-weight:bold;">${code}</p><p>This code expires in 10 minutes.</p>`,
  });
  return { sent, code };
};

export const verifyOtp = (user, code) => {
  if (!user.otpHash || !user.otpExpires) return false;
  if (Date.now() > user.otpExpires.getTime()) return false;
  return user.otpHash === hashOtp(String(code));
};
