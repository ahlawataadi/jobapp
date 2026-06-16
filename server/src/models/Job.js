import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", required: true, index: true },
    vendorSummary: {
      orgName: String,
      district: String,
      avgRating: Number,
      vendorUserId: String,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: { type: String, trim: true, index: true },
    industry: { type: String, trim: true, index: true },
    location: {
      district: { type: String, trim: true, index: true },
      city: { type: String, trim: true },
      geo: {
        type: { type: String, enum: ["Point"], default: "Point" },
        coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
      },
    },
    salaryMin: { type: Number, default: 0 },
    salaryMax: { type: Number, default: 0 },
    jobType: {
      type: String,
      enum: [
        "full-time",
        "part-time",
        "contract",
        "internship",
        "hourly",
        "daily-wage",
        "on-demand",
        "freelance",
      ],
      default: "full-time",
    },
    // What the salaryMin/salaryMax range is expressed in.
    payUnit: {
      type: String,
      enum: ["month", "hour", "day", "fixed"],
      default: "month",
    },
    status: { type: String, enum: ["open", "closed"], default: "open", index: true },
  },
  { timestamps: true }
);

jobSchema.index({ "location.geo": "2dsphere" });
jobSchema.index({ title: "text", description: "text" });
jobSchema.index({ "location.district": 1, category: 1, status: 1 });

export default mongoose.model("Job", jobSchema);
