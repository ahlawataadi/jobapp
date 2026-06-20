import AdminConfig, { getConfig } from "../models/AdminConfig.js";
import Vendor from "../models/Vendor.js";
import Payment from "../models/Payment.js";
import EtlRun from "../models/EtlRun.js";
import ActivityLog from "../models/ActivityLog.js";
import User from "../models/User.js";
import Job from "../models/Job.js";
import { dispatchWebhook } from "../utils/webhooks.js";
import { parseCsv, toCsv } from "../utils/csv.js";
import { persistUpload } from "../utils/storage.js";

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
        seekerSignupFee: config.seekerSignupFee,
        theme: config.theme,
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
        contactPacks: config.contactPacks,
        subscriptionPlans: config.subscriptionPlans,
        seekerPlans: config.seekerPlans ?? {
          basic:      { priceMonthly: 499,  features: "10 job applications/day, profile visibility, job alerts", buttonLabel: "" },
          pro:        { priceMonthly: 999,  features: "Unlimited applications, intro video profile, priority listing, resume builder", buttonLabel: "" },
          enterprise: { priceMonthly: 1999, features: "Everything in Pro, dedicated career counsellor, featured profile, API access", buttonLabel: "" },
        },
        vendorPlans: config.vendorPlans ?? {
          basic:      { priceMonthly: 999,  features: "5 active job posts, basic applicant tracking, email support", buttonLabel: "" },
          pro:        { priceMonthly: 2999, features: "25 active job posts, priority support, featured listings, intro video", buttonLabel: "" },
          enterprise: { priceMonthly: 9999, features: "Unlimited job posts, dedicated account manager, API access, bulk import", buttonLabel: "" },
        },
        aboutUsImage: config.aboutUsImage || "",
        contactImage: config.contactImage || "",
        termsContent: config.termsContent || "",
        termsImage: config.termsImage || "",
        privacyContent: config.privacyContent || "",
        privacyImage: config.privacyImage || "",
        featuredWorkerFee: config.featuredWorkerFee,
        featuredVendorFee: config.featuredVendorFee,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const updateAdminConfig = async (req, res, next) => {
  try {
    const { paymentRequired, signupFeeAmount, seekerSignupFee, theme, analyticsScript, siteName, siteTitle, metaDescription, aboutUs, contact, otpSettings, googleMapsApiKey } = req.body;
    const config = await getConfig();

    if (typeof paymentRequired === "boolean") config.paymentRequired = paymentRequired;
    if (seekerSignupFee && typeof seekerSignupFee === "object") {
      config.seekerSignupFee = {
        enabled: typeof seekerSignupFee.enabled === "boolean" ? seekerSignupFee.enabled : config.seekerSignupFee?.enabled ?? false,
        amount: typeof seekerSignupFee.amount === "number" && seekerSignupFee.amount >= 0 ? seekerSignupFee.amount : config.seekerSignupFee?.amount ?? 0,
      };
    }
    if (theme && typeof theme === "object") {
      config.theme = {
        primaryColor: typeof theme.primaryColor === "string" ? theme.primaryColor : config.theme?.primaryColor || "#2563eb",
        accentColor: typeof theme.accentColor === "string" ? theme.accentColor : config.theme?.accentColor || "#f97316",
        fontFamily: typeof theme.fontFamily === "string" ? theme.fontFamily : config.theme?.fontFamily || "Inter",
      };
      config.markModified("theme");
    }
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

    // Fee / pricing updates
    const { contactPacks, subscriptionPlans, seekerPlans, vendorPlans, featuredWorkerFee, featuredVendorFee } = req.body;
    if (contactPacks && typeof contactPacks === "object") {
      const cp = config.contactPacks || {};
      for (const tier of ["starter", "standard", "pro"]) {
        if (contactPacks[tier]) {
          if (typeof contactPacks[tier].credits === "number") cp[tier] = { ...cp[tier], credits: contactPacks[tier].credits };
          if (typeof contactPacks[tier].price === "number") cp[tier] = { ...cp[tier], price: contactPacks[tier].price };
        }
      }
      config.contactPacks = cp;
    }
    if (subscriptionPlans && typeof subscriptionPlans === "object") {
      const sp = config.subscriptionPlans || {};
      for (const tier of ["basic", "pro", "enterprise"]) {
        if (subscriptionPlans[tier]) {
          if (typeof subscriptionPlans[tier].priceMonthly === "number") sp[tier] = { ...sp[tier], priceMonthly: subscriptionPlans[tier].priceMonthly };
          if (typeof subscriptionPlans[tier].features === "string") sp[tier] = { ...sp[tier], features: subscriptionPlans[tier].features };
        }
      }
      config.subscriptionPlans = sp;
    }
    if (featuredWorkerFee && typeof featuredWorkerFee.pricePerWeek === "number") {
      config.featuredWorkerFee = { pricePerWeek: featuredWorkerFee.pricePerWeek };
    }
    if (featuredVendorFee && typeof featuredVendorFee.pricePerWeek === "number") {
      config.featuredVendorFee = { pricePerWeek: featuredVendorFee.pricePerWeek };
    }

    for (const [key, incoming] of [["seekerPlans", seekerPlans], ["vendorPlans", vendorPlans]]) {
      if (incoming && typeof incoming === "object") {
        const current = config[key] || {};
        for (const tier of ["basic", "pro", "enterprise"]) {
          if (incoming[tier]) {
            const t = current[tier] || {};
            if (typeof incoming[tier].priceMonthly === "number") t.priceMonthly = incoming[tier].priceMonthly;
            if (typeof incoming[tier].features === "string") t.features = incoming[tier].features;
            if (typeof incoming[tier].buttonLabel === "string") t.buttonLabel = incoming[tier].buttonLabel;
            current[tier] = t;
          }
        }
        config[key] = current;
        config.markModified(key);
      }
    }
    if (typeof req.body.aboutUsImage === "string") config.aboutUsImage = req.body.aboutUsImage;
    if (typeof req.body.contactImage === "string") config.contactImage = req.body.contactImage;
    if (typeof req.body.termsContent === "string") config.termsContent = req.body.termsContent;
    if (typeof req.body.privacyContent === "string") config.privacyContent = req.body.privacyContent;

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
    res.json({ smtp: config.smtp, sms: config.sms, paymentGateway: config.paymentGateway, r2Storage: config.r2Storage });
  } catch (err) {
    next(err);
  }
};

export const updateIntegrationSettings = async (req, res, next) => {
  try {
    const { smtp, sms, paymentGateway, r2Storage } = req.body;
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
    if (r2Storage && typeof r2Storage === "object") {
      config.r2Storage = { ...(config.r2Storage?.toObject?.() || config.r2Storage || {}), ...r2Storage };
    }

    await config.save();
    res.json({ smtp: config.smtp, sms: config.sms, paymentGateway: config.paymentGateway, r2Storage: config.r2Storage });
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
      User.aggregate([
        { $match: filter },
        { $sort: { [sortField]: sortDir } },
        { $skip: skip },
        { $limit: limit },
        { $lookup: { from: "vendors", localField: "_id", foreignField: "userId", as: "_v" } },
        { $addFields: { vendorId: { $ifNull: [{ $arrayElemAt: ["$_v._id", 0] }, null] } } },
        { $project: { passwordHash: 0, refreshTokenVersion: 0, _v: 0 } },
      ]),
      User.countDocuments(filter),
    ]);

    res.json({ items, total, page, pages: Math.ceil(total / limit) || 1 });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/users/:id/subscription
export const setUserSubscription = async (req, res, next) => {
  try {
    const { plan, expiresAt } = req.body;
    const VALID = ["none", "basic", "pro", "enterprise"];
    if (!VALID.includes(plan)) {
      return res.status(400).json({ message: `Invalid plan. Choose: ${VALID.join(", ")}` });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.subscription.plan = plan;
    user.subscription.expiresAt = expiresAt
      ? new Date(expiresAt)
      : plan === "none"
      ? null
      : (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d; })();

    await user.save();
    res.json({ subscription: user.subscription });
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
    const { vendorId, title, description, category, industry, district, city, salaryMin, salaryMax, jobType, payUnit } = req.body;
    if (!vendorId || !title || !description || !district) {
      return res.status(400).json({ message: "vendorId, title, description and district are required" });
    }

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) return res.status(404).json({ message: "Vendor not found" });

    const job = await Job.create({
      vendorId: vendor._id,
      vendorSummary: { orgName: vendor.orgName, district: vendor.district, avgRating: vendor.avgRating, vendorUserId: String(vendor.userId) },
      title,
      description,
      category,
      industry,
      location: { district, city, geo: { type: "Point", coordinates: [0, 0] } },
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

export const listPayments = async (req, res, next) => {
  try {
    const { status, search, sort = "createdAt", dir = "desc" } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const { page, limit, skip } = paginate(req.query);
    const sortField = SORT_FIELDS[sort] || "createdAt";
    const sortDir = dir === "asc" ? 1 : -1;

    if (req.query.type) filter.type = req.query.type;

    let query = Payment.find(filter)
      .populate("vendorId", "orgName district")
      .populate("userId", "name email role");
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

const JOB_TYPES = ["full-time", "part-time", "contract", "internship", "hourly", "daily-wage", "on-demand", "freelance"];
const PAY_UNITS = ["month", "hour", "day", "fixed"];

async function resolveVendorFromRow(row) {
  if (row.vendorId) {
    try {
      const v = await Vendor.findById(row.vendorId);
      if (v) return v;
    } catch (e) {
      /* invalid id */
    }
  }
  if (row.vendorOrgName) {
    const v = await Vendor.findOne({ orgName: row.vendorOrgName });
    if (v) return v;
  }
  if (row.vendorEmail) {
    const u = await User.findOne({ email: String(row.vendorEmail).toLowerCase() });
    if (u) return Vendor.findOne({ userId: u._id });
  }
  return null;
}

export function buildJobDoc(row, vendor) {
  return {
    vendorId: vendor._id,
    vendorSummary: { orgName: vendor.orgName, district: vendor.district, avgRating: vendor.avgRating, vendorUserId: String(vendor.userId) },
    title: row.title,
    description: row.description,
    category: row.category || "",
    industry: row.industry || "",
    location: { district: row.district, city: row.city || "", geo: { type: "Point", coordinates: [0, 0] } },
    salaryMin: Number(row.salaryMin) || 0,
    salaryMax: Number(row.salaryMax) || 0,
    jobType: JOB_TYPES.includes(row.jobType) ? row.jobType : "full-time",
    payUnit: PAY_UNITS.includes(row.payUnit) ? row.payUnit : "month",
  };
}

// POST /api/admin/import/jobs (multipart csv field "file")
// CSV columns: vendorId|vendorOrgName|vendorEmail,title,description,category,industry,district,city,salaryMin,salaryMax,jobType,payUnit
export const importJobs = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "CSV file is required" });
    const rows = parseCsv(req.file.buffer.toString("utf8"));
    const results = { created: 0, skipped: 0, errors: [] };

    for (const row of rows) {
      try {
        if (!row.title || !row.description || !row.district) {
          results.skipped += 1;
          continue;
        }
        const vendor = await resolveVendorFromRow(row);
        if (!vendor) {
          results.skipped += 1;
          results.errors.push(`No matching vendor for "${row.title}"`);
          continue;
        }
        const job = await Job.create(buildJobDoc(row, vendor));
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

function sendCsv(res, filename, csv) {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(csv);
}

// GET /api/admin/export/users
export const exportUsers = async (req, res, next) => {
  try {
    const users = await User.find().select("name email phone role status createdAt").sort({ createdAt: -1 }).lean();
    const rows = users.map((u) => ({
      name: u.name,
      email: u.email,
      phone: u.phone || "",
      role: u.role,
      status: u.status,
      createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : "",
    }));
    sendCsv(res, "users.csv", toCsv(rows, ["name", "email", "phone", "role", "status", "createdAt"]));
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/export/vendors
export const exportVendors = async (req, res, next) => {
  try {
    const vendors = await Vendor.find().populate("userId", "name email phone").sort({ createdAt: -1 }).lean();
    const rows = vendors.map((v) => ({
      orgName: v.orgName,
      industry: v.industry || "",
      district: v.district || "",
      address: v.address || "",
      status: v.status,
      paymentStatus: v.paymentStatus || "",
      avgRating: v.avgRating ?? "",
      contactName: v.userId?.name || "",
      contactEmail: v.userId?.email || "",
      contactPhone: v.userId?.phone || "",
      createdAt: v.createdAt ? new Date(v.createdAt).toISOString() : "",
    }));
    sendCsv(
      res,
      "vendors.csv",
      toCsv(rows, ["orgName", "industry", "district", "address", "status", "paymentStatus", "avgRating", "contactName", "contactEmail", "contactPhone", "createdAt"])
    );
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/export/jobs
export const exportJobs = async (req, res, next) => {
  try {
    const jobs = await Job.find().sort({ createdAt: -1 }).lean();
    const rows = jobs.map((j) => ({
      title: j.title,
      vendorOrgName: j.vendorSummary?.orgName || "",
      category: j.category || "",
      industry: j.industry || "",
      district: j.location?.district || "",
      city: j.location?.city || "",
      salaryMin: j.salaryMin,
      salaryMax: j.salaryMax,
      jobType: j.jobType,
      payUnit: j.payUnit || "month",
      status: j.status,
      createdAt: j.createdAt ? new Date(j.createdAt).toISOString() : "",
    }));
    sendCsv(
      res,
      "jobs.csv",
      toCsv(rows, ["title", "vendorOrgName", "category", "industry", "district", "city", "salaryMin", "salaryMax", "jobType", "payUnit", "status", "createdAt"])
    );
  } catch (err) {
    next(err);
  }
};

export const uploadLogo = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const config = await getConfig();
    config.logoUrl = await persistUpload(req.file, "branding");
    await config.save();
    res.json({ logoUrl: config.logoUrl });
  } catch (err) {
    next(err);
  }
};

export const uploadAboutImage = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const config = await getConfig();
    config.aboutUsImage = await persistUpload(req.file, "branding");
    await config.save();
    res.json({ imageUrl: config.aboutUsImage });
  } catch (err) { next(err); }
};

export const uploadContactImage = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const config = await getConfig();
    config.contactImage = await persistUpload(req.file, "branding");
    await config.save();
    res.json({ imageUrl: config.contactImage });
  } catch (err) { next(err); }
};

export const uploadTermsImage = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const config = await getConfig();
    config.termsImage = await persistUpload(req.file, "branding");
    await config.save();
    res.json({ imageUrl: config.termsImage });
  } catch (err) { next(err); }
};

export const uploadPrivacyImage = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const config = await getConfig();
    config.privacyImage = await persistUpload(req.file, "branding");
    await config.save();
    res.json({ imageUrl: config.privacyImage });
  } catch (err) { next(err); }
};

// POST /api/admin/branding/editor-image — inline image upload for the rich text editor.
// Returns a served URL so editor content stores a small link instead of a giant base64 blob.
export const uploadEditorImage = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const url = await persistUpload(req.file, "branding");
    res.json({ url });
  } catch (err) { next(err); }
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
