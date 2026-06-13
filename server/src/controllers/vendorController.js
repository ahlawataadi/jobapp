import Vendor from "../models/Vendor.js";
import { getConfig } from "../models/AdminConfig.js";

// Vendor signup: creates a Vendor profile linked to the logged-in user.
// Activation depends on AdminConfig.paymentRequired.
export const signupVendor = async (req, res, next) => {
  try {
    const { orgName, industry, address, district, coordinates } = req.body;
    if (!orgName || !district) {
      return res.status(400).json({ message: "orgName and district are required" });
    }

    const existing = await Vendor.findOne({ userId: req.user._id });
    if (existing) return res.status(409).json({ message: "Vendor profile already exists" });

    const config = await getConfig();

    const vendor = await Vendor.create({
      userId: req.user._id,
      orgName,
      industry,
      address,
      district,
      location: coordinates?.length === 2 ? { type: "Point", coordinates } : undefined,
      status: config.paymentRequired ? "pending" : "active",
      paymentStatus: config.paymentRequired ? "pending" : "not_required",
    });

    if (req.user.role !== "vendor") {
      req.user.role = "vendor";
      await req.user.save();
    }

    res.status(201).json({ vendor, paymentRequired: config.paymentRequired, signupFeeAmount: config.signupFeeAmount });
  } catch (err) {
    next(err);
  }
};

export const getMyVendor = async (req, res, next) => {
  try {
    const vendor = await Vendor.findOne({ userId: req.user._id });
    if (!vendor) return res.status(404).json({ message: "Vendor profile not found" });
    res.json({ vendor });
  } catch (err) {
    next(err);
  }
};

export const uploadVendorDocuments = async (req, res, next) => {
  try {
    const vendor = await Vendor.findOne({ userId: req.user._id });
    if (!vendor) return res.status(404).json({ message: "Vendor profile not found" });

    const files = req.files || [];
    const paths = files.map((f) => `/uploads/vendor-docs/${f.filename}`);
    vendor.documents.push(...paths);
    await vendor.save();

    res.json({ vendor });
  } catch (err) {
    next(err);
  }
};

export const uploadVendorLogo = async (req, res, next) => {
  try {
    const vendor = await Vendor.findOne({ userId: req.user._id });
    if (!vendor) return res.status(404).json({ message: "Vendor profile not found" });
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    vendor.logoUrl = `/uploads/avatars/${req.file.filename}`;
    await vendor.save();
    res.json({ vendor });
  } catch (err) {
    next(err);
  }
};

export const removeVendorLogo = async (req, res, next) => {
  try {
    const vendor = await Vendor.findOne({ userId: req.user._id });
    if (!vendor) return res.status(404).json({ message: "Vendor profile not found" });

    vendor.logoUrl = null;
    await vendor.save();
    res.json({ vendor });
  } catch (err) {
    next(err);
  }
};

export const getFeaturedVendors = async (req, res, next) => {
  try {
    const vendors = await Vendor.find({ status: "active" })
      .sort({ avgRating: -1, createdAt: -1 })
      .limit(8)
      .select("orgName industry district avgRating location logoUrl");
    res.json({ items: vendors });
  } catch (err) {
    next(err);
  }
};

export const getVendorPublic = async (req, res, next) => {
  try {
    const vendor = await Vendor.findById(req.params.id).select(
      "orgName industry address district avgRating status logoUrl"
    );
    if (!vendor) return res.status(404).json({ message: "Vendor not found" });
    res.json({ vendor });
  } catch (err) {
    next(err);
  }
};
