import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema(
  {
    fromId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    toId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    content: { type: String, required: true, maxlength: 2000 },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Compound index for fast conversation fetch
chatMessageSchema.index({ fromId: 1, toId: 1, createdAt: -1 });
chatMessageSchema.index({ toId: 1, fromId: 1, createdAt: -1 });

export default mongoose.model("ChatMessage", chatMessageSchema);
