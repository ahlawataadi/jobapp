import Job from "../models/Job.js";
import Vendor from "../models/Vendor.js";
import { dispatchWebhook } from "../utils/webhooks.js";

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
    });

    dispatchWebhook("job.created", { jobId: job._id, title: job.title, vendorId: job.vendorId });
    res.status(201).json({ job });
  } catch (err) {
    next(err);
  }
};

// GET /api/jobs?district=&category=&industry=&jobType=&minSalary=&maxSalary=&q=&sort=recent|salary&page=&limit=
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
      page = 1,
      limit = 20,
    } = req.query;

    const filter = { status: "open" };
    if (district) filter["location.district"] = district;
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
    };

    const pageNum = Math.max(Number(page) || 1, 1);
    const limitNum = Math.min(Math.max(Number(limit) || 20, 1), 100);

    const [items, total] = await Promise.all([
      Job.find(filter)
        .sort(sortMap[sort] || sortMap.recent)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Job.countDocuments(filter),
    ]);

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
