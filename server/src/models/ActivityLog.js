import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    name: String,
    email: String,
    role: String,
    action: { type: String, enum: ["signup", "login"], required: true },
    ip: String,
    userAgent: String,
    location: String,
  },
  { timestamps: true }
);

export default mongoose.model("ActivityLog", activityLogSchema);
