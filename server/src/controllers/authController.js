import crypto from "crypto";
import User from "../models/User.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/tokens.js";
import { sendMail } from "../utils/mailer.js";
import { generateAndSendOtp, verifyOtp as checkOtp } from "../utils/otp.js";
import { logActivity } from "../utils/activityLog.js";
import { getConfig } from "../models/AdminConfig.js";

// Picks a verification channel honoring admin OTP toggles. Returns null if
// no channel is enabled, meaning verification should be skipped entirely.
const resolveOtpChannel = async (preferred, hasPhone) => {
  const config = await getConfig();
  const emailOk = config.otpSettings?.emailEnabled !== false;
  const smsOk = config.otpSettings?.smsEnabled !== false && hasPhone;
  if (preferred === "phone" && smsOk) return "phone";
  if (preferred !== "phone" && emailOk) return "email";
  if (emailOk) return "email";
  if (smsOk) return "phone";
  return null;
};

const REFRESH_COOKIE = "jobapp_refresh";

const cookieOptions = () => ({
  httpOnly: true,
  // In production the SPA and API are on different sites (e.g. separate Render
  // services on *.onrender.com, a public suffix → cross-site). Cross-site
  // cookies must be SameSite=None + Secure, or the browser won't send the
  // refresh cookie back to /auth/refresh and the user is logged out on refresh.
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/api/auth",
});

const issueTokens = async (res, user) => {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions());
  return accessToken;
};

export const register = async (req, res, next) => {
  try {
    const { name, email, password, phone, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email and password are required" });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ message: "Email already registered" });

    const allowedRole = role === "vendor" ? "vendor" : "seeker";
    const preferredChannel = req.body.channel === "phone" && phone ? "phone" : "email";

    const user = new User({ name, email, phone, role: allowedRole });
    await user.setPassword(password);

    const channel = await resolveOtpChannel(preferredChannel, !!phone);
    if (!channel) {
      // OTP verification disabled entirely — activate the account immediately.
      user.isVerified = true;
      await user.save();
      const accessToken = await issueTokens(res, user);
      await logActivity(req, user, "signup");
      return res.status(201).json({ user: user.toSafeJSON(), accessToken, verified: true });
    }

    await user.save();
    const { sent, code } = await generateAndSendOtp(user, channel);

    const payload = {
      userId: user._id,
      channel,
      message: `A verification code has been sent to your ${channel === "phone" ? "phone" : "email"}.`,
    };
    // If email/SMS isn't configured yet, return the code directly so the demo still works.
    if (!sent) payload.devOtp = code;

    res.status(201).json(payload);
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    if (user.status === "suspended") {
      return res.status(403).json({ message: "Your account has been suspended" });
    }

    if (!user.isVerified) {
      const channel = await resolveOtpChannel(user.phone ? "phone" : "email", !!user.phone);
      if (!channel) {
        user.isVerified = true;
        await user.save();
      } else {
        const { sent, code } = await generateAndSendOtp(user, channel);
        const payload = {
          requiresVerification: true,
          userId: user._id,
          channel,
          message: `Please verify your account. A code has been sent to your ${channel === "phone" ? "phone" : "email"}.`,
        };
        if (!sent) payload.devOtp = code;
        return res.status(403).json(payload);
      }
    }

    const accessToken = await issueTokens(res, user);
    await logActivity(req, user, "login");
    res.json({ user: user.toSafeJSON(), accessToken });
  } catch (err) {
    next(err);
  }
};

export const verifyOtp = async (req, res, next) => {
  try {
    const { userId, code } = req.body;
    if (!userId || !code) return res.status(400).json({ message: "userId and code are required" });

    const user = await User.findById(userId).select("+otpHash +otpExpires +otpChannel");
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!checkOtp(user, code)) {
      return res.status(400).json({ message: "Invalid or expired code" });
    }

    user.isVerified = true;
    user.otpHash = undefined;
    user.otpExpires = undefined;
    user.otpChannel = undefined;
    await user.save();

    const accessToken = await issueTokens(res, user);
    await logActivity(req, user, "signup");
    res.json({ user: user.toSafeJSON(), accessToken });
  } catch (err) {
    next(err);
  }
};

export const resendOtp = async (req, res, next) => {
  try {
    const { userId, channel } = req.body;
    if (!userId) return res.status(400).json({ message: "userId is required" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.isVerified) return res.status(400).json({ message: "Account already verified" });

    const resolved = await resolveOtpChannel(channel === "phone" && user.phone ? "phone" : "email", !!user.phone);
    if (!resolved) {
      user.isVerified = true;
      await user.save();
      return res.json({ message: "Verification is disabled; your account has been activated." });
    }

    const useChannel = resolved;
    const { sent, code } = await generateAndSendOtp(user, useChannel);

    const payload = { message: `A new code has been sent to your ${useChannel === "phone" ? "phone" : "email"}.` };
    if (!sent) payload.devOtp = code;
    res.json(payload);
  } catch (err) {
    next(err);
  }
};

export const refresh = async (req, res, next) => {
  try {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) return res.status(401).json({ message: "No refresh token" });

    const payload = verifyRefreshToken(token);
    const user = await User.findById(payload.sub);
    if (!user || user.refreshTokenVersion !== payload.v) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const accessToken = await issueTokens(res, user);
    res.json({ user: user.toSafeJSON(), accessToken });
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired refresh token" });
  }
};

export const logout = async (req, res, next) => {
  try {
    res.clearCookie(REFRESH_COOKIE, {
      path: "/api/auth",
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });
    res.json({ message: "Logged out" });
  } catch (err) {
    next(err);
  }
};

export const me = async (req, res) => {
  res.json({ user: req.user.toSafeJSON() });
};

export const updateMe = async (req, res, next) => {
  try {
    const { name, phone } = req.body;
    if (name) req.user.name = name;
    if (phone !== undefined) req.user.phone = phone;
    await req.user.save();
    res.json({ user: req.user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "currentPassword and newPassword are required" });
    }

    const ok = await req.user.comparePassword(currentPassword);
    if (!ok) return res.status(401).json({ message: "Current password is incorrect" });

    await req.user.setPassword(newPassword);
    req.user.refreshTokenVersion += 1;
    await req.user.save();

    const accessToken = await issueTokens(res, req.user);
    res.json({ user: req.user.toSafeJSON(), accessToken });
  } catch (err) {
    next(err);
  }
};

export const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    req.user.avatarUrl = `/uploads/avatars/${req.file.filename}`;
    await req.user.save();
    res.json({ user: req.user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
};

export const removeAvatar = async (req, res, next) => {
  try {
    req.user.avatarUrl = null;
    await req.user.save();
    res.json({ user: req.user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
};

// Since no email service is configured, the reset token/URL is returned
// directly in the response so the client can complete the flow.
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "email is required" });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.json({ message: "If that email is registered, a reset link has been issued." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = crypto.createHash("sha256").update(token).digest("hex");
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000;
    await user.save();

    const resetUrl = `/reset-password?email=${encodeURIComponent(user.email)}&token=${token}`;
    const origin = req.headers.origin || "";
    const { sent } = await sendMail({
      to: user.email,
      subject: "Reset your password — Haryana Job Marketplace",
      html: `<p>Hi ${user.name || ""},</p><p>Click the link below to reset your password. This link expires in 1 hour.</p><p><a href="${origin}${resetUrl}">${origin}${resetUrl}</a></p>`,
    });

    const payload = {
      message: "If that email is registered, a reset link has been issued.",
    };
    // If SMTP isn't configured yet, return the token/URL directly so the demo still works.
    if (!sent) {
      payload.resetToken = token;
      payload.resetUrl = resetUrl;
    }

    res.json(payload);
  } catch (err) {
    next(err);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { email, token, password } = req.body;
    if (!email || !token || !password) {
      return res.status(400).json({ message: "email, token and password are required" });
    }

    const hashed = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      email: email.toLowerCase(),
      resetPasswordToken: hashed,
      resetPasswordExpires: { $gt: Date.now() },
    });
    if (!user) return res.status(400).json({ message: "Invalid or expired reset token" });

    await user.setPassword(password);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.refreshTokenVersion += 1;
    await user.save();

    res.json({ message: "Password reset successful. You can now log in." });
  } catch (err) {
    next(err);
  }
};
