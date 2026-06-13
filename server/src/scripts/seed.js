import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import User from "../models/User.js";
import Vendor from "../models/Vendor.js";
import Job from "../models/Job.js";
import AdminConfig, { getConfig } from "../models/AdminConfig.js";

const haryanaVendors = [
  {
    orgName: "Pathkind Diagnostics - Gurugram",
    industry: "Diagnostics",
    district: "Gurugram",
    address: "Sector 14, Gurugram, Haryana",
    coordinates: [77.0266, 28.4595],
    jobs: [
      { title: "Phlebotomist", category: "Lab Technician", jobType: "full-time", salaryMin: 15000, salaryMax: 22000 },
      { title: "Lab Technician - Pathology", category: "Lab Technician", jobType: "full-time", salaryMin: 18000, salaryMax: 28000 },
    ],
  },
  {
    orgName: "Dr Lal PathLabs - Faridabad",
    industry: "Diagnostics",
    district: "Faridabad",
    address: "NIT, Faridabad, Haryana",
    coordinates: [77.3178, 28.4089],
    jobs: [
      { title: "Sample Collection Executive", category: "Field Staff", jobType: "part-time", salaryMin: 12000, salaryMax: 18000 },
      { title: "Front Desk Receptionist", category: "Admin", jobType: "full-time", salaryMin: 13000, salaryMax: 17000 },
    ],
  },
  {
    orgName: "City Diagnostic Center - Hisar",
    industry: "Diagnostics",
    district: "Hisar",
    address: "Model Town, Hisar, Haryana",
    coordinates: [75.7217, 29.1492],
    jobs: [
      { title: "Radiology Technician", category: "Lab Technician", jobType: "full-time", salaryMin: 20000, salaryMax: 30000 },
    ],
  },
  {
    orgName: "Apex Logistics - Panipat",
    industry: "Logistics",
    district: "Panipat",
    address: "GT Road, Panipat, Haryana",
    coordinates: [76.9635, 29.3909],
    jobs: [
      { title: "Delivery Driver", category: "Driver", jobType: "full-time", salaryMin: 16000, salaryMax: 22000 },
      { title: "Warehouse Associate", category: "Warehouse", jobType: "full-time", salaryMin: 14000, salaryMax: 19000 },
    ],
  },
  {
    orgName: "Greenfield Textiles - Panchkula",
    industry: "Manufacturing",
    district: "Panchkula",
    address: "Industrial Area, Panchkula, Haryana",
    coordinates: [76.8606, 30.6942],
    jobs: [
      { title: "Machine Operator", category: "Production", jobType: "full-time", salaryMin: 13000, salaryMax: 18000 },
      { title: "Quality Inspector", category: "QA", jobType: "full-time", salaryMin: 16000, salaryMax: 23000 },
    ],
  },
  {
    orgName: "TechNova Solutions - Gurugram",
    industry: "IT Services",
    district: "Gurugram",
    address: "Cyber Hub, Gurugram, Haryana",
    coordinates: [77.0891, 28.4949],
    jobs: [
      { title: "Junior React Developer", category: "Software Development", jobType: "full-time", salaryMin: 25000, salaryMax: 45000 },
      { title: "QA Engineer (Manual)", category: "QA", jobType: "full-time", salaryMin: 20000, salaryMax: 35000 },
    ],
  },
];

const run = async () => {
  await connectDB();

  // 1. Admin config
  let config = await AdminConfig.findById("config");
  if (!config) {
    config = await AdminConfig.create({ _id: "config", paymentRequired: false, signupFeeAmount: 0 });
    console.log("Created default AdminConfig (paymentRequired=false)");
  }

  // 2. Admin user
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@jobapp.local").toLowerCase();
  let admin = await User.findOne({ email: adminEmail });
  if (!admin) {
    admin = new User({ name: "Admin", email: adminEmail, role: "admin", isVerified: true });
    await admin.setPassword(process.env.ADMIN_PASSWORD || "ChangeMe123!");
    await admin.save();
    console.log(`Created admin user: ${adminEmail}`);
  }

  // 3. Vendors + jobs
  for (const v of haryanaVendors) {
    const vendorEmail = `${v.orgName.toLowerCase().replace(/[^a-z0-9]+/g, ".")}@vendor.jobapp.local`;

    let user = await User.findOne({ email: vendorEmail });
    if (!user) {
      user = new User({ name: v.orgName, email: vendorEmail, role: "vendor", isVerified: true });
      await user.setPassword("VendorPass123!");
      await user.save();
    }

    let vendor = await Vendor.findOne({ userId: user._id });
    if (!vendor) {
      vendor = await Vendor.create({
        userId: user._id,
        orgName: v.orgName,
        industry: v.industry,
        address: v.address,
        district: v.district,
        location: { type: "Point", coordinates: v.coordinates },
        status: "active",
        paymentStatus: "not_required",
      });
      console.log(`Created vendor: ${v.orgName}`);
    }

    for (const j of v.jobs) {
      const exists = await Job.findOne({ vendorId: vendor._id, title: j.title });
      if (exists) continue;

      await Job.create({
        vendorId: vendor._id,
        vendorSummary: { orgName: vendor.orgName, district: vendor.district, avgRating: vendor.avgRating },
        title: j.title,
        description: `${j.title} position at ${v.orgName}, ${v.district}, Haryana. Apply now to join our team.`,
        category: j.category,
        industry: v.industry,
        location: { district: v.district, city: v.district, geo: { type: "Point", coordinates: v.coordinates } },
        salaryMin: j.salaryMin,
        salaryMax: j.salaryMax,
        jobType: j.jobType,
        status: "open",
      });
      console.log(`  + Job: ${j.title}`);
    }
  }

  // 4. Sample job seekers
  const seekers = [
    { name: "Rohit Sharma", email: "rohit.seeker@jobapp.local", phone: "9876500001" },
    { name: "Priya Verma", email: "priya.seeker@jobapp.local", phone: "9876500002" },
  ];
  for (const s of seekers) {
    let user = await User.findOne({ email: s.email });
    if (!user) {
      user = new User({ name: s.name, email: s.email, phone: s.phone, role: "seeker", isVerified: true });
      await user.setPassword("SeekerPass123!");
      await user.save();
      console.log(`Created seeker: ${s.email}`);
    }
  }

  // 5. Sample application from Rohit to the first job
  const rohit = await User.findOne({ email: "rohit.seeker@jobapp.local" });
  const firstJob = await Job.findOne();
  if (rohit && firstJob) {
    const Application = (await import("../models/Application.js")).default;
    const exists = await Application.findOne({ userId: rohit._id, jobId: firstJob._id });
    if (!exists) {
      await Application.create({ userId: rohit._id, jobId: firstJob._id, status: "applied", coverNote: "I'm interested in this role and available immediately." });
      console.log("Created sample application for Rohit");
    }
  }

  console.log("Seed complete.");
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
