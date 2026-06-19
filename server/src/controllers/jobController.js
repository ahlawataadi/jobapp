import Job from "../models/Job.js";
import Vendor from "../models/Vendor.js";
import User from "../models/User.js";
import { dispatchWebhook } from "../utils/webhooks.js";
import { parseCsv } from "../utils/csv.js";

const JOB_TYPES = ["full-time", "part-time", "contract", "internship", "hourly", "daily-wage", "on-demand", "freelance"];
const PAY_UNITS = ["month", "hour", "day", "fixed"];

export const createJob = async (req, res, next) => {
  try {
    const vendor = req.vendor;
    if (vendor.status !== "active") {
      return res.status(403).json({ message: "Vendor account is not active yet" });
    }

    const {
      title,
      description,
      category,
      industry,
      district,
      city,
      coordinates,
      salaryMin,
      salaryMax,
      jobType,
      payUnit,
    } = req.body;

    if (!title || !description || !district) {
      return res.status(400).json({ message: "title, description and district are required" });
    }

    const job = await Job.create({
      vendorId: vendor._id,
      vendorSummary: {
        orgName: vendor.orgName,
        district: vendor.district,
        avgRating: vendor.avgRating,
        vendorUserId: String(vendor.userId),
      },
      title,
      description,
      category,
      industry,
      location: {
        district,
        city,
        geo: { type: "Point", coordinates: coordinates?.length === 2 ? coordinates : [0, 0] },
      },
      salaryMin,
      salaryMax,
      jobType,
      payUnit,
    });

    dispatchWebhook("job.created", { jobId: job._id, title: job.title, vendorId: job.vendorId });
    res.status(201).json({ job });
  } catch (err) {
    next(err);
  }
};

// GET /api/jobs?district=&category=&industry=&jobType=&minSalary=&maxSalary=&q=&sort=recent|salary|salary_asc&lat=&lng=&radius=&page=&limit=
export const listJobs = async (req, res, next) => {
  try {
    const {
      district,
      category,
      industry,
      jobType,
      minSalary,
      maxSalary,
      q,
      sort = "recent",
      lat,
      lng,
      radius,
      page = 1,
      limit = 10,
    } = req.query;

    const filter = { status: "open" };
    if (district) {
      const re = new RegExp(district.trim().split(/[\s,]+/).filter(Boolean).join("|"), "i");
      filter.$or = [{ "location.district": re }, { "location.city": re }];
    }
    if (category) filter.category = category;
    if (industry) filter.industry = industry;
    if (jobType) filter.jobType = jobType;
    if (minSalary || maxSalary) {
      filter.salaryMax = {};
      if (minSalary) filter.salaryMax.$gte = Number(minSalary);
      if (maxSalary) filter.salaryMin = { $lte: Number(maxSalary) };
    }
    if (q) {
      filter.$text = { $search: q };
    }

    const sortMap = {
      recent: { createdAt: -1 },
      salary: { salaryMax: -1 },
      salary_asc: { salaryMin: 1 },
    };

    const pageNum = Math.max(Number(page) || 1, 1);
    const limitNum = Math.min(Math.max(Number(limit) || 10, 1), 100);

    let items, total;

    if (lat && lng) {
      // Geo search — $near requires no other sort
      const radiusM = (Number(radius) || 25) * 1000;
      const geoFilter = {
        ...filter,
        "location.geo": {
          $near: {
            $geometry: { type: "Point", coordinates: [Number(lng), Number(lat)] },
            $maxDistance: radiusM,
          },
        },
      };
      [items, total] = await Promise.all([
        Job.find(geoFilter).skip((pageNum - 1) * limitNum).limit(limitNum),
        Job.countDocuments(geoFilter),
      ]);
    } else {
      [items, total] = await Promise.all([
        Job.find(filter)
          .sort(sortMap[sort] || sortMap.recent)
          .skip((pageNum - 1) * limitNum)
          .limit(limitNum),
        Job.countDocuments(filter),
      ]);
    }

    res.json({
      items,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
    });
  } catch (err) {
    next(err);
  }
};

export const districtStats = async (req, res, next) => {
  try {
    const stats = await Job.aggregate([
      { $match: { status: "open" } },
      {
        $group: {
          _id: "$location.district",
          count: { $sum: 1 },
          coordinates: { $first: "$location.geo.coordinates" },
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.json({
      items: stats.map((s) => ({
        district: s._id,
        count: s.count,
        coordinates: s.coordinates,
      })),
    });
  } catch (err) {
    next(err);
  }
};

export const suggestJobs = async (req, res, next) => {
  try {
    const { q = "" } = req.query;
    if (!q.trim()) return res.json({ items: [] });

    const regex = new RegExp(q.trim(), "i");
    const titles = await Job.find({ status: "open", title: regex })
      .select("title")
      .limit(8);

    const unique = [...new Set(titles.map((j) => j.title))];
    res.json({ items: unique });
  } catch (err) {
    next(err);
  }
};

export const getJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found" });
    res.json({ job });
  } catch (err) {
    next(err);
  }
};

export const updateJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found" });
    if (job.vendorId.toString() !== req.vendor._id.toString()) {
      return res.status(403).json({ message: "Not your job posting" });
    }

    const allowed = [
      "title",
      "description",
      "category",
      "industry",
      "salaryMin",
      "salaryMax",
      "jobType",
      "payUnit",
      "status",
    ];
    for (const key of allowed) {
      if (key in req.body) job[key] = req.body[key];
    }
    if (req.body.district) job.location.district = req.body.district;
    if (req.body.city) job.location.city = req.body.city;

    await job.save();
    res.json({ job });
  } catch (err) {
    next(err);
  }
};

export const deleteJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found" });
    if (job.vendorId.toString() !== req.vendor._id.toString()) {
      return res.status(403).json({ message: "Not your job posting" });
    }
    await job.deleteOne();
    res.json({ message: "Job deleted" });
  } catch (err) {
    next(err);
  }
};

export const listMyJobs = async (req, res, next) => {
  try {
    const jobs = await Job.find({ vendorId: req.vendor._id }).sort({ createdAt: -1 });
    res.json({ items: jobs });
  } catch (err) {
    next(err);
  }
};

// POST /api/jobs/import (vendor, multipart csv field "file")
// CSV columns: title,description,category,industry,district,city,salaryMin,salaryMax,jobType,payUnit
export const importMyJobs = async (req, res, next) => {
  try {
    const vendor = req.vendor;
    if (vendor.status !== "active") {
      return res.status(403).json({ message: "Vendor account is not active yet" });
    }
    if (!req.file) return res.status(400).json({ message: "CSV file is required" });

    const rows = parseCsv(req.file.buffer.toString("utf8"));
    const results = { created: 0, skipped: 0, errors: [] };

    for (const row of rows) {
      try {
        if (!row.title || !row.description || !row.district) {
          results.skipped += 1;
          continue;
        }
        const job = await Job.create({
          vendorId: vendor._id,
          vendorSummary: { orgName: vendor.orgName, district: vendor.district, avgRating: vendor.avgRating },
          title: row.title,
          description: row.description,
          category: row.category || "",
          industry: row.industry || "",
          location: { district: row.district, city: row.city || "", geo: { type: "Point", coordinates: [0, 0] } },
          salaryMin: Number(row.salaryMin) || 0,
          salaryMax: Number(row.salaryMax) || 0,
          jobType: JOB_TYPES.includes(row.jobType) ? row.jobType : "full-time",
          payUnit: PAY_UNITS.includes(row.payUnit) ? row.payUnit : "month",
        });
        dispatchWebhook("job.created", { jobId: job._id, title: job.title, vendorId: job.vendorId });
        results.created += 1;
      } catch (e) {
        results.errors.push(e.message);
      }
    }

    res.json(results);
  } catch (err) {
    next(err);
  }
};

// POST /api/jobs/compare  { ids: [..] }
export const compareJobs = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "ids array required" });
    }
    const jobs = await Job.find({ _id: { $in: ids } });
    const vendorIds = jobs.map((j) => j.vendorId);
    const vendors = await Vendor.find({ _id: { $in: vendorIds } }).select(
      "orgName district avgRating industry"
    );
    res.json({ jobs, vendors });
  } catch (err) {
    next(err);
  }
};

// GET /api/jobs/saved/me — the current user's bookmarked jobs (with vendor summary)
export const listSavedJobs = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("savedJobs");
    const ids = user?.savedJobs || [];
    const jobs = await Job.find({ _id: { $in: ids } }).sort({ createdAt: -1 }).lean();
    const vendors = await Vendor.find({ _id: { $in: jobs.map((j) => j.vendorId) } })
      .select("orgName district avgRating logoUrl")
      .lean();
    const vmap = Object.fromEntries(vendors.map((v) => [String(v._id), v]));
    const items = jobs.map((j) => ({ ...j, vendorSummary: vmap[String(j.vendorId)] || null }));
    res.json({ items, total: items.length });
  } catch (err) {
    next(err);
  }
};

// POST /api/jobs/:id/save — bookmark a job
export const saveJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id).select("_id");
    if (!job) return res.status(404).json({ message: "Job not found" });
    // $addToSet keeps it idempotent (no duplicates).
    await User.updateOne({ _id: req.user._id }, { $addToSet: { savedJobs: job._id } });
    res.json({ saved: true, jobId: job._id });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/jobs/:id/save — remove a bookmark
export const unsaveJob = async (req, res, next) => {
  try {
    await User.updateOne({ _id: req.user._id }, { $pull: { savedJobs: req.params.id } });
    res.json({ saved: false, jobId: req.params.id });
  } catch (err) {
    next(err);
  }
};
