import Vendor from "../models/Vendor.js";
import { getConfig } from "../models/AdminConfig.js";
import { persistUpload } from "../utils/storage.js";

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
    const paths = await Promise.all(files.map((f) => persistUpload(f, "vendor-docs")));
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

    vendor.logoUrl = await persistUpload(req.file, "avatars");
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
      "orgName industry address district avgRating status logoUrl profileVideoUrl businesses userId"
    );
    if (!vendor) return res.status(404).json({ message: "Vendor not found" });
    res.json({ vendor });
  } catch (err) {
    next(err);
  }
};

// POST /api/vendors/me/video
export const uploadVendorVideo = async (req, res, next) => {
  try {
    const vendor = await Vendor.findOne({ userId: req.user._id });
    if (!vendor) return res.status(404).json({ message: "Vendor profile not found" });
    if (!req.file) return res.status(400).json({ message: "No video file uploaded" });

    vendor.profileVideoUrl = await persistUpload(req.file, "videos");
    await vendor.save();
    res.json({ vendor });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/vendors/me/video
export const removeVendorVideo = async (req, res, next) => {
  try {
    const vendor = await Vendor.findOne({ userId: req.user._id });
    if (!vendor) return res.status(404).json({ message: "Vendor profile not found" });
    vendor.profileVideoUrl = null;
    await vendor.save();
    res.json({ vendor });
  } catch (err) {
    next(err);
  }
};

// POST /api/vendors/me/businesses
export const addBusiness = async (req, res, next) => {
  try {
    const vendor = await Vendor.findOne({ userId: req.user._id });
    if (!vendor) return res.status(404).json({ message: "Vendor profile not found" });

    const { name, industry, district, address } = req.body;
    if (!name) return res.status(400).json({ message: "Business name is required" });
    if (vendor.businesses.length >= 10) {
      return res.status(400).json({ message: "Maximum 10 businesses allowed" });
    }

    vendor.businesses.push({ name, industry: industry || "", district: district || "", address: address || "" });
    await vendor.save();
    res.status(201).json({ businesses: vendor.businesses });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/vendors/me/businesses/:id
export const removeBusiness = async (req, res, next) => {
  try {
    const vendor = await Vendor.findOne({ userId: req.user._id });
    if (!vendor) return res.status(404).json({ message: "Vendor profile not found" });

    const business = vendor.businesses.id(req.params.id);
    if (!business) return res.status(404).json({ message: "Business not found" });

    business.deleteOne();
    await vendor.save();
    res.json({ businesses: vendor.businesses });
  } catch (err) {
    next(err);
  }
};
