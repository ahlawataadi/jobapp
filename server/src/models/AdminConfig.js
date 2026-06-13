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
  otpSettings: {
    emailEnabled: { type: Boolean, default: true },
    smsEnabled: { type: Boolean, default: true },
  },
  googleMapsApiKey: { type: String, default: "" },
  aboutUs: {
    type: String,
    default:
      "Job Marketplace connects job seekers with employers in diagnostics, manufacturing, logistics, IT, and more. Our mission is to make local hiring fast, transparent, and accessible — whether you're looking for your first job or your next career move.\n\nWe work with vendors and employers across districts and regions to bring verified job openings directly to job seekers, with tools for applications, comparisons, and reviews.\n\nFor employers, we provide a streamlined dashboard to post jobs, manage applications, and track hiring performance — all in one place.",
  },
  contact: {
    email: { type: String, default: "support@jobmarketplace.example" },
    phone: { type: String, default: "+91 8708730150" },
    address: { type: String, default: "India" },
    message: { type: String, default: "Have a question or need help? Reach out and our team will get back to you." },
  },
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
