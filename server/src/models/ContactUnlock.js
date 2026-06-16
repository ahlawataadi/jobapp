import mongoose from "mongoose";

const contactUnlockSchema = new mongoose.Schema(
  {
    vendorUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    workerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

contactUnlockSchema.index({ vendorUserId: 1, workerId: 1 }, { unique: true });

export default mongoose.model("ContactUnlock", contactUnlockSchema);
