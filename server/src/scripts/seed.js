import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import User from "../models/User.js";
import Vendor from "../models/Vendor.js";
import Job from "../models/Job.js";
import Blog from "../models/Blog.js";
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
        vendorSummary: { orgName: vendor.orgName, district: vendor.district, avgRating: vendor.avgRating, vendorUserId: String(user._id) },
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

  // 4. Sample job seekers / workers
  const workerProfiles = [
    {
      name: "Rohit Sharma",
      email: "rohit.seeker@jobapp.local",
      phone: "9876500001",
      workerProfile: {
        skillCategory: "home-repair",
        skills: ["Electrician", "AC Technician"],
        bio: "Licensed electrician with 5 years experience in residential and commercial wiring.",
        hourlyRate: 300,
        dailyRate: 1800,
        payPreference: "daily",
        location: { district: "Gurugram", city: "Sector 14" },
        languages: ["Hindi", "English"],
        experience: "5 years",
        verificationStatus: "verified",
        verificationBadge: true,
        availability: [...Array(10)].map((_, i) => {
          const d = new Date(); d.setDate(d.getDate() + i + 1);
          return d.toISOString().slice(0, 10);
        }),
      },
    },
    {
      name: "Priya Verma",
      email: "priya.seeker@jobapp.local",
      phone: "9876500002",
      workerProfile: {
        skillCategory: "household",
        skills: ["Maid", "Cook"],
        bio: "Experienced household helper available for cooking and cleaning in Faridabad.",
        hourlyRate: 150,
        dailyRate: 800,
        payPreference: "daily",
        location: { district: "Faridabad", city: "NIT" },
        languages: ["Hindi"],
        experience: "3 years",
        verificationStatus: "verified",
        verificationBadge: true,
        availability: [...Array(14)].map((_, i) => {
          const d = new Date(); d.setDate(d.getDate() + i + 1);
          return d.toISOString().slice(0, 10);
        }),
      },
    },
    {
      name: "Mohit Yadav",
      email: "mohit.seeker@jobapp.local",
      phone: "9876500003",
      workerProfile: {
        skillCategory: "home-repair",
        skills: ["Plumber", "Carpenter"],
        bio: "Professional plumber handling leakage, pipe fitting and bathroom installations.",
        hourlyRate: 350,
        dailyRate: 2000,
        payPreference: "hourly",
        location: { district: "Rohtak", city: "Model Town" },
        languages: ["Hindi"],
        experience: "7 years",
        verificationStatus: "pending",
        verificationBadge: false,
      },
    },
    {
      name: "Anita Singh",
      email: "anita.seeker@jobapp.local",
      phone: "9876500004",
      workerProfile: {
        skillCategory: "healthcare",
        skills: ["Nurse", "Caregiver"],
        bio: "Qualified nurse with experience in home patient care and post-surgery support.",
        hourlyRate: 400,
        dailyRate: 2500,
        payPreference: "daily",
        location: { district: "Panipat", city: "Sector 7" },
        languages: ["Hindi", "English"],
        experience: "6 years",
        verificationStatus: "verified",
        verificationBadge: true,
        availability: [...Array(7)].map((_, i) => {
          const d = new Date(); d.setDate(d.getDate() + i + 2);
          return d.toISOString().slice(0, 10);
        }),
      },
    },
    {
      name: "Ramesh Kumar",
      email: "ramesh.seeker@jobapp.local",
      phone: "9876500005",
      workerProfile: {
        skillCategory: "automotive",
        skills: ["Mechanic", "EV Technician"],
        bio: "Multi-brand auto mechanic specialising in engine repair and servicing.",
        hourlyRate: 250,
        dailyRate: 1500,
        payPreference: "hourly",
        location: { district: "Hisar", city: "Red Square Market" },
        languages: ["Hindi"],
        experience: "9 years",
        verificationStatus: "verified",
        verificationBadge: true,
        featured: true,
        featuredUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        availability: [...Array(12)].map((_, i) => {
          const d = new Date(); d.setDate(d.getDate() + i + 1);
          return d.toISOString().slice(0, 10);
        }),
      },
    },
    {
      name: "Sunita Devi",
      email: "sunita.seeker@jobapp.local",
      phone: "9876500006",
      workerProfile: {
        skillCategory: "home-repair",
        skills: ["Painter", "RO Technician"],
        bio: "Skilled painter with expertise in interior and exterior residential painting.",
        hourlyRate: 280,
        dailyRate: 1600,
        payPreference: "daily",
        location: { district: "Ambala", city: "Ambala City" },
        languages: ["Hindi"],
        experience: "4 years",
        verificationStatus: "pending",
        verificationBadge: false,
      },
    },
  ];

  for (const s of workerProfiles) {
    let user = await User.findOne({ email: s.email });
    if (!user) {
      user = new User({ name: s.name, email: s.email, phone: s.phone, role: "seeker", isVerified: true });
      await user.setPassword("SeekerPass123!");
    }
    // Always update workerProfile so re-seeding refreshes data
    user.workerProfile = s.workerProfile;
    await user.save();
    console.log(`Upserted worker: ${s.email}`);
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

  // 6. Sample blog posts
  const adminUser = await User.findOne({ role: "admin" });
  const sampleBlogs = [
    {
      title: "Top 5 In-Demand Skills in Haryana 2025",
      slug: "top-5-in-demand-skills-haryana-2025",
      excerpt: "From electricians to home nurses, discover which worker skills are most sought after across Haryana districts this year.",
      content: `<h2>The Job Market is Changing Fast</h2><p>Haryana's rapid urbanisation and growing middle class have created strong demand for skilled tradespeople and domestic workers. Here are the five most in-demand skills right now.</p><h3>1. Electricians</h3><p>With new housing societies coming up in Gurugram, Faridabad and Panchkula, qualified electricians are in short supply. Daily rates have risen to ₹1,500–₹2,500.</p><h3>2. Home Nurses / Patient Care</h3><p>An ageing population means elder care is booming. Trained nurses can command ₹2,000–₹3,500 per day for home visits.</p><h3>3. Plumbers</h3><p>Infrastructure expansion means constant demand. Plumbers in Rohtak and Hisar earn ₹1,500–₹2,000 daily.</p><h3>4. Auto Mechanics</h3><p>Two-wheeler and four-wheeler penetration is high. Multi-brand mechanics rarely sit idle.</p><h3>5. Cooks / Domestic Helpers</h3><p>Dual-income households need reliable household help. Experienced cooks earn ₹800–₹1,500 per day.</p><p>Register on JobApp today to connect with employers near you.</p>`,
      tags: ["skills", "haryana", "jobs", "2025"],
      category: "Career Advice",
      status: "published",
      publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      seo: { metaTitle: "Top 5 In-Demand Worker Skills in Haryana 2025", metaDescription: "Discover the most sought-after worker skills across Haryana in 2025 — from electricians to home nurses." },
    },
    {
      title: "How to Find Daily Wage Work Near You",
      slug: "how-to-find-daily-wage-work-near-you",
      excerpt: "A step-by-step guide for daily wage workers to find legitimate employers, avoid scams, and get paid on time.",
      content: `<h2>Finding Work Has Never Been Easier</h2><p>Gone are the days of standing at a labour chowk hoping for work. Digital platforms now connect daily wage workers directly with employers in their area.</p><h3>Step 1: Create a Profile</h3><p>List your skills, your district, and your daily rate. A complete profile gets 3x more enquiries than an empty one.</p><h3>Step 2: Set Your Availability</h3><p>Mark the days you're free. Employers filter by availability, so keeping it updated is crucial.</p><h3>Step 3: Respond Quickly</h3><p>First response often wins the job. Enable notifications so you're alerted immediately.</p><h3>Step 4: Use In-App Chat</h3><p>Negotiate terms safely through the platform's messaging system. Never share your personal phone number before agreeing on a rate.</p><h3>Step 5: Build Reviews</h3><p>After each job, ask the employer to leave a review. Positive reviews unlock better-paying opportunities.</p>`,
      tags: ["daily-wage", "tips", "workers"],
      category: "Worker Guide",
      status: "published",
      publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      seo: { metaTitle: "How to Find Daily Wage Work Near You in Haryana", metaDescription: "Tips for daily wage workers to find safe, legitimate work through digital platforms." },
    },
    {
      title: "Hiring a Maid or Cook in Gurugram: What to Expect",
      slug: "hiring-maid-cook-gurugram-guide",
      excerpt: "A practical guide for families looking to hire domestic help in Gurugram — rates, background checks, and best practices.",
      content: `<h2>Domestic Help in Gurugram</h2><p>Finding reliable household help in Gurugram is a common challenge. This guide covers everything you need to know.</p><h3>Market Rates (2025)</h3><ul><li>Part-time maid (2 hrs/day): ₹3,000–₹5,000/month</li><li>Full-time cook: ₹8,000–₹15,000/month</li><li>Live-in housekeeper: ₹12,000–₹20,000/month</li></ul><h3>What to Check</h3><p>Always verify Aadhaar ID. Ask for references from previous employers. Use a platform that shows verified badges — these workers have been ID-checked.</p><h3>Using In-App Chat</h3><p>Discuss duties, timings and rates through the app before sharing your address. This protects both parties.</p><h3>Payment</h3><p>Agree on salary day in advance. Digital transfers (UPI) are preferred over cash for a paper trail.</p>`,
      tags: ["domestic-help", "gurugram", "hiring-guide"],
      category: "Employer Guide",
      status: "published",
      publishedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      seo: { metaTitle: "Hiring a Maid or Cook in Gurugram — Rates & Tips 2025", metaDescription: "Complete guide to hiring domestic help in Gurugram: market rates, verification tips and best practices." },
    },
    {
      title: "Understanding Gig Work: Hourly vs Daily vs Fixed Price",
      slug: "gig-work-hourly-daily-fixed-price-explained",
      excerpt: "Not sure which pay structure to offer or accept? This breakdown helps both workers and employers choose the right model.",
      content: `<h2>Gig Work Pay Structures</h2><p>The rise of on-demand and freelance work has created multiple pay models. Understanding each helps you earn more or hire smarter.</p><h3>Hourly Rate</h3><p><strong>Best for:</strong> Short tasks with unpredictable durations (plumbing repairs, electrical fixes).<br><strong>Typical range:</strong> ₹150–₹500/hr depending on skill level.</p><h3>Daily Rate</h3><p><strong>Best for:</strong> Full-day engagements (construction labour, event cooking, painting).<br><strong>Typical range:</strong> ₹700–₹2,500/day.</p><h3>Fixed Price (Project)</h3><p><strong>Best for:</strong> Well-defined deliverables (paint one room, fix one pipe, write one document).<br>Agree on scope upfront to avoid disputes.</p><h3>Monthly Retainer</h3><p><strong>Best for:</strong> Recurring household help, office cleaning contracts.<br>Provides income stability for the worker and cost predictability for the employer.</p><p>All four models are supported on JobApp. Workers can set their preferred pay type in their profile.</p>`,
      tags: ["gig-work", "freelance", "pay-structure"],
      category: "Career Advice",
      status: "published",
      publishedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      seo: { metaTitle: "Gig Work Pay Structures Explained: Hourly vs Daily vs Fixed", metaDescription: "Learn the difference between hourly, daily, and fixed-price gig work and which suits your needs." },
    },
    {
      title: "Safety Tips for Workers Meeting Clients for the First Time",
      slug: "safety-tips-workers-meeting-clients",
      excerpt: "Your safety matters. Follow these simple steps before accepting a new job through any platform.",
      content: `<h2>Stay Safe When Starting a New Job</h2><p>Whether you're an electrician, nurse, or domestic helper, meeting a new client always carries some risk. Here's how to stay safe.</p><h3>1. Verify the Employer</h3><p>Check the employer's profile rating and reviews. Verified employers have completed an ID check on the platform.</p><h3>2. Share Your Itinerary</h3><p>Tell a trusted family member or friend where you're going, the employer's name, and when you expect to return.</p><h3>3. Keep Initial Chats on the Platform</h3><p>Don't move to WhatsApp or personal calls until you're confident about the employer. In-app messages are recorded and moderated.</p><h3>4. Don't Share Bank Details Upfront</h3><p>Legitimate employers pay after work is done. Anyone asking for your account details before the job is a red flag.</p><h3>5. Trust Your Instincts</h3><p>If something feels wrong, it probably is. It's always better to decline a job than to put yourself at risk.</p><p>JobApp's in-app chat automatically removes phone numbers and email addresses until both parties are ready to connect — protecting you from the start.</p>`,
      tags: ["safety", "workers", "tips"],
      category: "Worker Guide",
      status: "published",
      publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      seo: { metaTitle: "Safety Tips for Workers Meeting New Clients in 2025", metaDescription: "Essential safety advice for domestic workers, tradespeople and gig workers meeting new clients." },
    },
  ];

  for (const b of sampleBlogs) {
    const exists = await Blog.findOne({ slug: b.slug });
    if (!exists) {
      await Blog.create({ ...b, authorId: adminUser?._id, authorName: adminUser?.name || "Admin" });
      console.log(`Created blog: ${b.title}`);
    }
  }

  console.log("Seed complete.");
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
