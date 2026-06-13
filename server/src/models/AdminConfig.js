import mongoose from "mongoose";

const adminConfigSchema = new mongoose.Schema({
  _id: { type: String, default: "config" },
  paymentRequired: { type: Boolean, default: false },
  signupFeeAmount: { type: Number, default: 0 }, // paise
  analyticsScript: { type: String, default: "" },
  siteName: { type: String, default: "Haryana Job Marketplace" },
  siteTitle: { type: String, default: "Haryana Job Marketplace — Find Jobs Across Haryana" },
  metaDescription: { type: String, default: "Connecting job seekers with employers across Haryana — diagnostics, manufacturing, logistics, IT and more." },
  logoUrl: { type: String, default: "" },
  smtp: {
    host: { type: String, default: "" },
    port: { type: Number, default: 587 },
    secure: { type: Boolean, default: false },
    user: { type: String, default: "" },
    pass: { type: String, default: "" },
    fromName: { type: String, default: "Haryana Job Marketplace" },
    fromEmail: { type: String, default: "" },
  },
  sms: {
    provider: { type: String, default: "twilio" },
    apiUrl: { type: String, default: "" },
    apiKey: { type: String, default: "" },
    senderId: { type: String, default: "" },
    accountSid: { type: String, default: "" },
    authToken: { type: String, default: "" },
    fromNumber: { type: String, default: "" },
  },
  paymentGateway: {
    provider: { type: String, default: "razorpay" },
    keyId: { type: String, default: "" },
    keySecret: { type: String, default: "" },
    webhookSecret: { type: String, default: "" },
  },
});

export const getConfig = async () => {
  let config = await AdminConfig.findById("config");
  if (!config) {
    config = await AdminConfig.create({ _id: "config" });
  }
  return config;
};

const AdminConfig = mongoose.model("AdminConfig", adminConfigSchema);
export default AdminConfig;
