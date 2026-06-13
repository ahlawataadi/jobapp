import mongoose from "mongoose";

const broadcastSchema = new mongoose.Schema(
  {
    channel: { type: String, enum: ["email", "sms"], required: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
    audience: { type: String, enum: ["seekers", "vendors", "all"], required: true },
    recipientCount: { type: Number, default: 0 },
    sentCount: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("Broadcast", broadcastSchema);
