import mongoose from "mongoose";

const bannerSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, trim: true },
    ctaText: { type: String, trim: true, default: "Learn more" },
    ctaLink: { type: String, trim: true, default: "/jobs" },
    theme: { type: String, default: "primary" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Banner", bannerSchema);
