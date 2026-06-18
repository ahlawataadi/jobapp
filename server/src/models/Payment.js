import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    // vendor_signup payments link to a Vendor; subscription/contactPack link to a User
    type: { type: String, enum: ["vendor_signup", "subscription", "contactPack"], default: "vendor_signup" },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", index: true, default: null },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true, default: null },
    subscriptionPlan: { type: String, enum: ["basic", "pro", "enterprise"], default: null },
    contactPackKey: { type: String, default: null },   // starter | standard | pro
    creditsAdded: { type: Number, default: 0 },
    razorpayOrderId: { type: String, required: true },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },
    amount: { type: Number, required: true }, // in paise
    currency: { type: String, default: "INR" },
    status: {
      type: String,
      enum: ["created", "paid", "failed", "refunded", "disputed"],
      default: "created",
    },
    refundAmount: { type: Number, default: 0 },
    refundReason: { type: String, default: null },
    notes: { type: String, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("Payment", paymentSchema);
