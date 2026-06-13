import mongoose from "mongoose";

const etlRunSchema = new mongoose.Schema(
  {
    source: { type: String, default: "demo-haryana-labs" },
    status: { type: String, enum: ["running", "success", "failed"], default: "running" },
    fetched: { type: Number, default: 0 },
    created: { type: Number, default: 0 },
    updated: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 },
    error: { type: String },
    startedAt: { type: Date, default: Date.now },
    finishedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model("EtlRun", etlRunSchema);
