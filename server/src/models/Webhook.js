import mongoose from "mongoose";

const webhookSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true },
    events: [{ type: String }],
    secret: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    lastTriggeredAt: { type: Date, default: null },
    lastStatus: { type: String, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("Webhook", webhookSchema);
