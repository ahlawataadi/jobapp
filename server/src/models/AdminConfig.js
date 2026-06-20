import mongoose from "mongoose";

const adminConfigSchema = new mongoose.Schema({
  _id: { type: String, default: "config" },
  paymentRequired: { type: Boolean, default: false },
  signupFeeAmount: { type: Number, default: 0 }, // paise (vendor signup fee)
  // Job-seeker signup fee (separate from the vendor one).
  seekerSignupFee: {
    enabled: { type: Boolean, default: false },
    amount: { type: Number, default: 0 }, // paise
  },
  // Appearance / theme (applied at runtime via CSS variables).
  theme: {
    primaryColor: { type: String, default: "#2563eb" }, // base of the primary palette
    accentColor: { type: String, default: "#f97316" },  // base of the accent palette
    fontFamily: { type: String, default: "Inter" },
  },
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
  // Cloudflare R2 file storage. When enabled (with account ID + bucket) uploads
  // go to R2; otherwise files are kept on local disk. DB values take precedence
  // over the STORAGE_DRIVER / R2_* env vars. See docs/R2_SETUP.md.
  r2Storage: {
    enabled: { type: Boolean, default: false },
    accountId: { type: String, default: "" },
    bucket: { type: String, default: "" },
    accessKeyId: { type: String, default: "" },
    secretAccessKey: { type: String, default: "" },
    publicUrl: { type: String, default: "" },  // r2.dev or custom domain
  },
  // Pricing & fees (all amounts in ₹)
  contactPacks: {
    starter:  { credits: { type: Number, default: 10  }, price: { type: Number, default: 49  } },
    standard: { credits: { type: Number, default: 25  }, price: { type: Number, default: 199 } },
    pro:      { credits: { type: Number, default: 40  }, price: { type: Number, default: 499 } },
  },
  // Legacy (kept for migration safety — new code uses seekerPlans / vendorPlans)
  subscriptionPlans: {
    basic:      { priceMonthly: { type: Number, default: 999   }, features: { type: String, default: "Up to 10 contact unlocks/month, basic support" } },
    pro:        { priceMonthly: { type: Number, default: 2999  }, features: { type: String, default: "Up to 30 contact unlocks/month, priority support, featured listings" } },
    enterprise: { priceMonthly: { type: Number, default: 9999  }, features: { type: String, default: "Unlimited contact unlocks, dedicated account manager, API access" } },
  },
  seekerPlans: {
    basic:      { priceMonthly: { type: Number, default: 499  }, features: { type: String, default: "10 job applications/day, profile visibility, job alerts" }, buttonLabel: { type: String, default: "" } },
    pro:        { priceMonthly: { type: Number, default: 999  }, features: { type: String, default: "Unlimited applications, intro video profile, priority listing, resume builder" }, buttonLabel: { type: String, default: "" } },
    enterprise: { priceMonthly: { type: Number, default: 1999 }, features: { type: String, default: "Everything in Pro, dedicated career counsellor, featured profile, API access" }, buttonLabel: { type: String, default: "" } },
  },
  vendorPlans: {
    basic:      { priceMonthly: { type: Number, default: 999  }, features: { type: String, default: "5 active job posts, basic applicant tracking, email support" }, buttonLabel: { type: String, default: "" } },
    pro:        { priceMonthly: { type: Number, default: 2999 }, features: { type: String, default: "25 active job posts, priority support, featured listings, intro video" }, buttonLabel: { type: String, default: "" } },
    enterprise: { priceMonthly: { type: Number, default: 9999 }, features: { type: String, default: "Unlimited job posts, dedicated account manager, API access, bulk import" }, buttonLabel: { type: String, default: "" } },
  },
  aboutUsImage: { type: String, default: "" },
  contactImage: { type: String, default: "" },
  termsContent: { type: String, default: "" },
  termsImage:   { type: String, default: "" },
  privacyContent: { type: String, default: "" },
  privacyImage:   { type: String, default: "" },
  featuredWorkerFee: {
    pricePerWeek: { type: Number, default: 99 },
  },
  featuredVendorFee: {
    pricePerWeek: { type: Number, default: 199 },
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
