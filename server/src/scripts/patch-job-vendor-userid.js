import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import Job from "../models/Job.js";
import Vendor from "../models/Vendor.js";

await connectDB();

const jobs = await Job.find({ "vendorSummary.vendorUserId": { $exists: false } }).lean();
console.log(`Jobs to patch: ${jobs.length}`);

let updated = 0;
for (const j of jobs) {
  const vendor = await Vendor.findById(j.vendorId).select("userId").lean();
  if (!vendor?.userId) continue;
  await Job.updateOne({ _id: j._id }, { $set: { "vendorSummary.vendorUserId": String(vendor.userId) } });
  updated++;
}

console.log(`Updated: ${updated}`);
await mongoose.disconnect();
