import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema(
  {
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    resumeUrl: { type: String },
    coverNote: { type: String },
    status: {
      type: String,
      enum: ["applied", "shortlisted", "rejected"],
      default: "applied",
    },
  },
  { timestamps: true }
);

applicationSchema.index({ jobId: 1, userId: 1 }, { unique: true });

export default mongoose.model("Application", applicationSchema);
