import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", required: true, index: true },
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
