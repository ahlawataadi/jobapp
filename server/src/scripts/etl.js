// Demo ETL pipeline: simulates fetching medical testing lab data for Haryana
// from a public-source / Google Places style feed, then normalizes,
// geocodes, deduplicates and imports into MongoDB.
//
// In production, replace `fetchRawPlaces()` with real calls to the
// Google Places API (Text Search "medical testing labs in <district>, Haryana")
// using GOOGLE_PLACES_API_KEY from the environment.

import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import User from "../models/User.js";
import Vendor from "../models/Vendor.js";
import Job from "../models/Job.js";
import EtlRun from "../models/EtlRun.js";

// District centroid coordinates used to geocode entries that have no
// precise lat/lng from the source feed.
const DISTRICT_COORDS = {
  Gurugram: [77.0266, 28.4595],
  Faridabad: [77.3178, 28.4089],
  Hisar: [75.7217, 29.1492],
  Panipat: [76.9635, 29.3909],
  Panchkula: [76.8606, 30.6942],
  Rohtak: [76.6066, 28.8955],
  Karnal: [76.9905, 29.6857],
  Ambala: [76.7794, 30.3782],
};

// Simulated raw feed (intentionally messy: duplicates, inconsistent casing,
// missing coordinates) to exercise normalize/geocode/dedupe logic.
function fetchRawPlaces() {
  return [
    {
      placeId: "demo-001",
      name: "  metro pathology lab ",
      district: "gurugram",
      address: "DLF Phase 2, Gurugram, Haryana",
      phone: "+91-9810000001",
    },
    {
      placeId: "demo-001-dup",
      name: "Metro Pathology Lab",
      district: "Gurugram",
      address: "DLF Phase 2, Gurugram, Haryana",
      phone: "+91-9810000001",
    },
    {
      placeId: "demo-002",
      name: "Sehgal Diagnostic & Imaging Centre",
      district: "Faridabad",
      address: "Sector 15, Faridabad, Haryana",
      phone: "+91-9810000002",
    },
    {
      placeId: "demo-003",
      name: "Hisar Multispeciality Diagnostics",
      district: "Hisar",
      address: "Civil Lines, Hisar, Haryana",
      phone: "+91-9810000003",
    },
    {
      placeId: "demo-004",
      name: "Panipat Clinical Laboratory",
      district: "Panipat",
      address: "Model Town, Panipat, Haryana",
      phone: "+91-9810000004",
    },
    {
      placeId: "demo-005",
      name: "Panchkula Health Check Centre",
      district: "Panchkula",
      address: "Sector 8, Panchkula, Haryana",
      phone: "+91-9810000005",
    },
    {
      placeId: "demo-006",
      name: "Rohtak Diagnostic Hub",
      district: "Rohtak",
      address: "Model Town, Rohtak, Haryana",
      phone: "+91-9810000006",
    },
    {
      placeId: "demo-007",
      name: "Karnal Pathlab & Scan Centre",
      district: "Karnal",
      address: "Kunjpura Road, Karnal, Haryana",
      phone: "+91-9810000007",
    },
    {
      placeId: "demo-008",
      name: "  ambala cantt diagnostic services",
      district: "Ambala",
      address: "Cantt Area, Ambala, Haryana",
      phone: "+91-9810000008",
    },
    {
      placeId: "demo-009",
      name: "",
      district: "Gurugram",
      address: "Sector 29, Gurugram, Haryana",
      phone: "+91-9810000009",
    },
  ];
}

function normalize(raw) {
  const name = (raw.name || "").trim().replace(/\s+/g, " ");
  const district = (raw.district || "").trim();
  const districtTitle = district
    ? district[0].toUpperCase() + district.slice(1).toLowerCase()
    : "";
  const orgName = name
    .split(" ")
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");

  return {
    placeId: raw.placeId,
    orgName,
    district: districtTitle,
    address: raw.address?.trim() || "",
    phone: raw.phone?.trim() || "",
  };
}

function geocode(entry) {
  return DISTRICT_COORDS[entry.district] || [76.5, 29.0]; // Haryana centroid fallback
}

function isValid(entry) {
  return Boolean(entry.orgName && entry.district && DISTRICT_COORDS[entry.district]);
}

async function run() {
  await connectDB();

  const etlRun = await EtlRun.create({ source: "demo-haryana-labs", status: "running" });
  const stats = { fetched: 0, created: 0, updated: 0, skipped: 0 };

  try {
    const raw = fetchRawPlaces();
    stats.fetched = raw.length;

    const normalized = raw.map(normalize).filter((entry) => {
      if (!isValid(entry)) {
        stats.skipped += 1;
        return false;
      }
      return true;
    });

    // Deduplicate by orgName + district (case-insensitive)
    const seen = new Map();
    for (const entry of normalized) {
      const key = `${entry.orgName.toLowerCase()}|${entry.district.toLowerCase()}`;
      if (seen.has(key)) {
        stats.skipped += 1;
        continue;
      }
      seen.set(key, entry);
    }

    for (const entry of seen.values()) {
      const coordinates = geocode(entry);
      const slug = entry.orgName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const email = `etl+${slug}@labs.example.com`;

      let user = await User.findOne({ email });
      if (!user) {
        user = new User({ name: entry.orgName, email, phone: entry.phone, role: "vendor" });
        await user.setPassword("ChangeMe123!");
        await user.save();
      }

      const existingVendor = await Vendor.findOne({ userId: user._id });
      const vendorData = {
        userId: user._id,
        orgName: entry.orgName,
        industry: "Diagnostics",
        address: entry.address,
        district: entry.district,
        location: { type: "Point", coordinates },
        status: "active",
        paymentStatus: "not_required",
        source: "etl:demo-haryana-labs",
      };

      let vendor;
      if (existingVendor) {
        vendor = await Vendor.findByIdAndUpdate(existingVendor._id, vendorData, { new: true });
        stats.updated += 1;
      } else {
        vendor = await Vendor.create(vendorData);
        stats.created += 1;

        await Job.create({
          vendorId: vendor._id,
          vendorSummary: { orgName: vendor.orgName, district: vendor.district, avgRating: 0 },
          title: "Lab Technician",
          description: `${entry.orgName} is hiring a lab technician for sample collection and processing.`,
          category: "Lab Technician",
          industry: "Diagnostics",
          jobType: "full-time",
          salaryMin: 14000,
          salaryMax: 22000,
          location: {
            district: entry.district,
            city: entry.district,
            geo: { type: "Point", coordinates },
          },
          status: "open",
        });
      }
    }

    etlRun.status = "success";
  } catch (err) {
    etlRun.status = "failed";
    etlRun.error = err.message;
  } finally {
    etlRun.fetched = stats.fetched;
    etlRun.created = stats.created;
    etlRun.updated = stats.updated;
    etlRun.skipped = stats.skipped;
    etlRun.finishedAt = new Date();
    await etlRun.save();
  }

  console.log("ETL run complete:", stats, "status:", etlRun.status);
  await mongoose.connection.close();
}

run();
