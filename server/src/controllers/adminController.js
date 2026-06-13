import AdminConfig, { getConfig } from "../models/AdminConfig.js";
import Vendor from "../models/Vendor.js";
import Payment from "../models/Payment.js";
import EtlRun from "../models/EtlRun.js";
import ActivityLog from "../models/ActivityLog.js";
import User from "../models/User.js";
import Job from "../models/Job.js";
import { dispatchWebhook } from "../utils/webhooks.js";

const paginate = (query) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
};

// Public — only exposes settings that are safe to send to anonymous visitors.
export const getAdminConfig = async (req, res, next) => {
  try {
    const config = await getConfig();
    res.json({
      config: {
        paymentRequired: config.paymentRequired,
        signupFeeAmount: config.signupFeeAmount,
        analyticsScript: config.analyticsScript,
        siteName: config.siteName,
        siteTitle: config.siteTitle,
        metaDescription: config.metaDescription,
        logoUrl: config.logoUrl,
        aboutUs: config.aboutUs,
        contact: config.contact,
        otpSettings: config.otpSettings,
        googleMapsApiKey: config.googleMapsApiKey,
        paymentGateway: { provider: config.paymentGateway?.provider, keyId: config.paymentGateway?.keyId },
      },
    });
  } catch (err) {
    next(err);
  }
};

export const updateAdminConfig = async (req, res, next) => {
  try {
    const { paymentRequired, signupFeeAmount, analyticsScript, siteName, siteTitle, metaDescription, aboutUs, contact, otpSettings, googleMapsApiKey } = req.body;
    const config = await getConfig();

    if (typeof paymentRequired === "boolean") config.paymentRequired = paymentRequired;
    if (typeof signupFeeAmount === "number" && signupFeeAmount >= 0) {
      config.signupFeeAmount = signupFeeAmount;
    }
    if (typeof analyticsScript === "string") config.analyticsScript = analyticsScript;
    if (typeof siteName === "string") config.siteName = siteName;
    if (typeof siteTitle === "string") config.siteTitle = siteTitle;
    if (typeof metaDescription === "string") config.metaDescription = metaDescription;
    if (typeof aboutUs === "string") config.aboutUs = aboutUs;
    if (contact && typeof contact === "object") {
      config.contact = {
        email: typeof contact.email === "string" ? contact.email : config.contact?.email || "",
        phone: typeof contact.phone === "string" ? contact.phone : config.contact?.phone || "",
        address: typeof contact.address === "string" ? contact.address : config.contact?.address || "",
        message: typeof contact.message === "string" ? contact.message : config.contact?.message || "",
      };
    }
    if (otpSettings && typeof otpSettings === "object") {
      config.otpSettings = {
        emailEnabled: typeof otpSettings.emailEnabled === "boolean" ? otpSettings.emailEnabled : config.otpSettings?.emailEnabled ?? true,
        smsEnabled: typeof otpSettings.smsEnabled === "boolean" ? otpSettings.smsEnabled : config.otpSettings?.smsEnabled ?? true,
      };
    }
    if (typeof googleMapsApiKey === "string") config.googleMapsApiKey = googleMapsApiKey;

    await config.save();
    res.json({ config });
  } catch (err) {
    next(err);
  }
};

// Admin-only — full integration settings (SMTP, SMS gateway, payment gateway keys).
export const getIntegrationSettings = async (req, res, next) => {
  try {
    const config = await getConfig();
    res.json({ smtp: config.smtp, sms: config.sms, paymentGateway: config.paymentGateway });
  } catch (err) {
    next(err);
  }
};

export const updateIntegrationSettings = async (req, res, next) => {
  try {
    const { smtp, sms, paymentGateway } = req.body;
    const config = await getConfig();

    if (smtp && typeof smtp === "object") {
      config.smtp = { ...(config.smtp?.toObject?.() || config.smtp || {}), ...smtp };
    }
    if (sms && typeof sms === "object") {
      config.sms = { ...(config.sms?.toObject?.() || config.sms || {}), ...sms };
    }
    if (paymentGateway && typeof paymentGateway === "object") {
      config.paymentGateway = { ...(config.paymentGateway?.toObject?.() || config.paymentGateway || {}), ...paymentGateway };
    }

    await config.save();
    res.json({ smtp: config.smtp, sms: config.sms, paymentGateway: config.paymentGateway });
  } catch (err) {
    next(err);
  }
};

const SORT_FIELDS = {
  createdAt: "createdAt",
  name: "name",
  orgName: "orgName",
  email: "email",
  district: "district",
  status: "status",
  amount: "amount",
  title: "title",
};

export const listVendors = async (req, res, next) => {
  try {
    const { status, search, sort = "createdAt", dir = "desc" } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (search) {
      const re = new RegExp(search, "i");
      filter.$or = [{ orgName: re }, { district: re }, { industry: re }];
    }

    const { page, limit, skip } = paginate(req.query);
    const sortField = SORT_FIELDS[sort] || "createdAt";
    const sortDir = dir === "asc" ? 1 : -1;

    const [items, total] = await Promise.all([
      Vendor.find(filter)
        .populate("userId", "name email phone")
        .sort({ [sortField]: sortDir })
        .skip(skip)
        .limit(limit),
      Vendor.countDocuments(filter),
    ]);

    res.json({ items, total, page, pages: Math.ceil(total / limit) || 1 });
  } catch (err) {
    next(err);
  }
};

export const updateVendorStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!["pending", "active", "suspended"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) return res.status(404).json({ message: "Vendor not found" });

    vendor.status = status;
    await vendor.save();
    dispatchWebhook("vendor.status_changed", { vendorId: vendor._id, orgName: vendor.orgName, status });
    res.json({ vendor });
  } catch (err) {
    next(err);
  }
};

export const listEtlRuns = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const [items, total] = await Promise.all([
      EtlRun.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      EtlRun.countDocuments(),
    ]);
    res.json({ items, total, page, pages: Math.ceil(total / limit) || 1 });
  } catch (err) {
    next(err);
  }
};

export const listUsers = async (req, res, next) => {
  try {
    const { role, status, search, sort = "createdAt", dir = "desc" } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (status) filter.status = status;
    if (search) {
      const re = new RegExp(search, "i");
      filter.$or = [{ name: re }, { email: re }];
    }

    const { page, limit, skip } = paginate(req.query);
    const sortField = SORT_FIELDS[sort] || "createdAt";
    const sortDir = dir === "asc" ? 1 : -1;

    const [items, total] = await Promise.all([
      User.find(filter)
        .select("-passwordHash -refreshTokenVersion")
        .sort({ [sortField]: sortDir })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    res.json({ items, total, page, pages: Math.ceil(total / limit) || 1 });
  } catch (err) {
    next(err);
  }
};

export const updateUserStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!["active", "suspended"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role === "admin") return res.status(400).json({ message: "Cannot modify admin accounts" });

    user.status = status;
    user.refreshTokenVersion += 1;
    await user.save();
    res.json({ user: user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
};

export const adminCreateUser = async (req, res, next) => {
  try {
    const { name, email, password, phone, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email and password are required" });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ message: "Email already registered" });

    const user = new User({
      name,
      email,
      phone,
      role: ["seeker", "vendor", "admin"].includes(role) ? role : "seeker",
    });
    await user.setPassword(password);
    await user.save();

    dispatchWebhook("user.created", { userId: user._id, email: user.email, role: user.role });
    res.status(201).json({ user: user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
};

export const adminCreateVendor = async (req, res, next) => {
  try {
    const { name, email, password, phone, orgName, industry, address, district, status } = req.body;
    if (!name || !email || !password || !orgName || !district) {
      return res.status(400).json({ message: "name, email, password, orgName and district are required" });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ message: "Email already registered" });

    const user = new User({ name, email, phone, role: "vendor" });
    await user.setPassword(password);
    await user.save();

    const vendor = await Vendor.create({
      userId: user._id,
      orgName,
      industry,
      address,
      district,
      status: ["pending", "active", "suspended"].includes(status) ? status : "active",
      paymentStatus: "not_required",
    });

    dispatchWebhook("user.created", { userId: user._id, email: user.email, role: user.role });
    res.status(201).json({ user: user.toSafeJSON(), vendor });
  } catch (err) {
    next(err);
  }
};

export const adminCreateJob = async (req, res, next) => {
  try {
    const { vendorId, title, description, category, industry, district, city, salaryMin, salaryMax, jobType } = req.body;
    if (!vendorId || !title || !description || !district) {
      return res.status(400).json({ message: "vendorId, title, description and district are required" });
    }

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) return res.status(404).json({ message: "Vendor not found" });

    const job = await Job.create({
      vendorId: vendor._id,
      vendorSummary: { orgName: vendor.orgName, district: vendor.district, avgRating: vendor.avgRating },
      title,
      description,
      category,
      industry,
      location: { district, city, geo: { type: "Point", coordinates: [0, 0] } },
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

export const listPayments = async (req, res, next) => {
  try {
    const { status, search, sort = "createdAt", dir = "desc" } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const { page, limit, skip } = paginate(req.query);
    const sortField = SORT_FIELDS[sort] || "createdAt";
    const sortDir = dir === "asc" ? 1 : -1;

    let query = Payment.find(filter).populate("vendorId", "orgName district");
    if (search) {
      const re = new RegExp(search, "i");
      query = query.where({
        $or: [{ razorpayOrderId: re }, { razorpayPaymentId: re }],
      });
    }

    const [items, total] = await Promise.all([
      query
        .sort({ [sortField]: sortDir })
        .skip(skip)
        .limit(limit),
      Payment.countDocuments(filter),
    ]);

    res.json({ items, total, page, pages: Math.ceil(total / limit) || 1 });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/payments/:id/refund  { amount?, reason }
export const refundPayment = async (req, res, next) => {
  try {
    const { amount, reason } = req.body;
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: "Payment not found" });
    if (payment.status !== "paid") {
      return res.status(400).json({ message: "Only paid payments can be refunded" });
    }

    payment.status = "refunded";
    payment.refundAmount = amount || payment.amount;
    payment.refundReason = reason || "Refunded by admin";
    await payment.save();

    dispatchWebhook("payment.refunded", {
      paymentId: payment._id,
      vendorId: payment.vendorId,
      amount: payment.refundAmount,
      reason: payment.refundReason,
    });

    res.json({ payment });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/payments/:id  { status?, notes? } - mark disputed/resolve conflicts
export const updatePayment = async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: "Payment not found" });

    if (status && ["created", "paid", "failed", "refunded", "disputed"].includes(status)) {
      payment.status = status;
    }
    if (typeof notes === "string") payment.notes = notes;

    await payment.save();
    res.json({ payment });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/import/users (multipart csv field "file")
// CSV columns: name,email,password,phone,role
export const importUsers = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "CSV file is required" });

    const rows = parseCsv(req.file.buffer.toString("utf8"));
    const results = { created: 0, skipped: 0, errors: [] };

    for (const row of rows) {
      try {
        const { name, email, password, phone, role } = row;
        if (!name || !email || !password) {
          results.skipped += 1;
          continue;
        }
        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing) {
          results.skipped += 1;
          continue;
        }
        const user = new User({
          name,
          email,
          phone,
          role: ["seeker", "vendor", "admin"].includes(role) ? role : "seeker",
        });
        await user.setPassword(password);
        await user.save();
        dispatchWebhook("user.created", { userId: user._id, email: user.email, role: user.role });
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

// POST /api/admin/import/vendors (multipart csv field "file")
// CSV columns: name,email,password,phone,orgName,industry,address,district,status
export const importVendors = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "CSV file is required" });

    const rows = parseCsv(req.file.buffer.toString("utf8"));
    const results = { created: 0, skipped: 0, errors: [] };

    for (const row of rows) {
      try {
        const { name, email, password, phone, orgName, industry, address, district, status } = row;
        if (!name || !email || !password || !orgName || !district) {
          results.skipped += 1;
          continue;
        }
        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing) {
          results.skipped += 1;
          continue;
        }
        const user = new User({ name, email, phone, role: "vendor" });
        await user.setPassword(password);
        await user.save();

        await Vendor.create({
          userId: user._id,
          orgName,
          industry,
          address,
          district,
          status: ["pending", "active", "suspended"].includes(status) ? status : "active",
          paymentStatus: "not_required",
        });

        dispatchWebhook("user.created", { userId: user._id, email: user.email, role: user.role });
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

// Minimal CSV parser: handles header row + comma-separated values, no quoted-comma support.
function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(",").map((c) => c.trim());
    const row = {};
    headers.forEach((h, i) => (row[h] = cells[i]));
    return row;
  });
}

export const uploadLogo = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const config = await getConfig();
    config.logoUrl = `/uploads/branding/${req.file.filename}`;
    await config.save();
    res.json({ logoUrl: config.logoUrl });
  } catch (err) {
    next(err);
  }
};

export const listActivityLogs = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const [items, total] = await Promise.all([
      ActivityLog.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      ActivityLog.countDocuments(),
    ]);
    res.json({ items, total, page, pages: Math.ceil(total / limit) || 1 });
  } catch (err) {
    next(err);
  }
};
