import mongoose from "mongoose";

const vendorSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    orgName: { type: String, required: true, trim: true },
    industry: { type: String, trim: true },
    address: { type: String, trim: true },
    district: { type: String, trim: true, index: true },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
    },
    status: {
      type: String,
      enum: ["pending", "active", "suspended"],
      default: "pending",
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ["not_required", "pending", "paid"],
      default: "not_required",
    },
    logoUrl: { type: String, default: null },
    profileVideoUrl: { type: String, default: null },  // short intro video (premium)
    avgRating: { type: Number, default: 0 },
    documents: [{ type: String }],
    source: { type: String, default: "manual" },
    businesses: [
      {
        name: { type: String, required: true, trim: true },
        industry: { type: String, trim: true, default: "" },
        district: { type: String, trim: true, default: "" },
        address: { type: String, trim: true, default: "" },
      },
    ],
  },
  { timestamps: true }
);

vendorSchema.index({ location: "2dsphere" });

export default mongoose.model("Vendor", vendorSchema);
