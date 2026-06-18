import User from "../models/User.js";
import ContactUnlock from "../models/ContactUnlock.js";
import { persistUpload } from "../utils/storage.js";

const CATEGORY_ENUM = ["household", "home-repair", "automotive", "construction", "healthcare"];

// GET /api/workers?category=&skill=&district=&lat=&lng=&radius=&verified=&page=&limit=
export const listWorkers = async (req, res, next) => {
  try {
    const { category, skill, district, lat, lng, radius, verified, featured, sort = "default", page = 1, limit = 10 } = req.query;
    const skip = (Math.max(Number(page), 1) - 1) * Math.min(Number(limit), 50);
    const lim = Math.min(Number(limit) || 20, 50);

    // List all active seekers in the worker directory. A skill category is no
    // longer required — registered seekers appear even before they complete
    // their profile (it's only enforced when the user filters by a category).
    const filter = {
      role: "seeker",
      status: { $ne: "suspended" },
    };

    if (category && CATEGORY_ENUM.includes(category)) {
      filter["workerProfile.skillCategory"] = category;
    }
    if (skill) {
      filter["workerProfile.skills"] = { $regex: new RegExp(skill, "i") };
    }
    if (district) {
      filter["workerProfile.location.district"] = { $regex: new RegExp(district, "i") };
    }
    if (verified === "true") {
      filter["workerProfile.verificationBadge"] = true;
    }
    if (featured === "true") {
      filter["workerProfile.featured"] = true;
    }

    let query;
    // Geo search takes priority over plain filters
    if (lat && lng) {
      const radiusM = (Number(radius) || 10) * 1000; // km → metres
      query = User.find({
        ...filter,
        "workerProfile.location.geo": {
          $near: {
            $geometry: { type: "Point", coordinates: [Number(lng), Number(lat)] },
            $maxDistance: radiusM,
          },
        },
      });
    } else {
      const sortMap = {
        rate_low:  { "workerProfile.dailyRate": 1 },
        rate_high: { "workerProfile.dailyRate": -1 },
        newest:    { createdAt: -1 },
        default:   { "workerProfile.featured": -1, "workerProfile.verificationBadge": -1, createdAt: -1 },
      };
      query = User.find(filter).sort(sortMap[sort] || sortMap.default);
    }

    const [items, total] = await Promise.all([
      query
        .select("name avatarUrl workerProfile.skillCategory workerProfile.skills workerProfile.bio workerProfile.hourlyRate workerProfile.dailyRate workerProfile.payPreference workerProfile.location workerProfile.verificationBadge workerProfile.featured workerProfile.languages")
        .skip(skip)
        .limit(lim)
        .lean(),
      User.countDocuments(filter),
    ]);

    res.json({ items, total, page: Number(page), pages: Math.ceil(total / lim) || 1 });
  } catch (err) {
    next(err);
  }
};

// GET /api/workers/:id — public profile (contact details hidden unless unlocked)
export const getWorker = async (req, res, next) => {
  try {
    const worker = await User.findOne({ _id: req.params.id, role: "seeker", status: "active" })
      .select("name avatarUrl workerProfile createdAt")
      .lean();

    if (!worker) return res.status(404).json({ message: "Worker not found" });

    let contactUnlocked = false;
    if (req.user) {
      contactUnlocked = !!(await ContactUnlock.exists({ vendorUserId: req.user._id, workerId: worker._id }));
    }

    // Mask contact if not unlocked
    const profile = { ...worker };
    if (!contactUnlocked) {
      profile.phone = undefined;
      profile.email = undefined;
    }

    res.json({ worker: profile, contactUnlocked });
  } catch (err) {
    next(err);
  }
};

// PUT /api/workers/me — update own worker profile (seekers only)
export const updateMyWorkerProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const {
      skillCategory,
      skills,
      bio,
      hourlyRate,
      dailyRate,
      monthlyRate,
      payPreference,
      district,
      city,
      coordinates,
      availability,
      languages,
      experience,
      voiceProfileUrl,
    } = req.body;

    if (skillCategory !== undefined) user.workerProfile.skillCategory = skillCategory;
    if (Array.isArray(skills)) user.workerProfile.skills = skills.slice(0, 20);
    if (bio !== undefined) user.workerProfile.bio = String(bio).slice(0, 1000);
    if (hourlyRate !== undefined) user.workerProfile.hourlyRate = Math.max(0, Number(hourlyRate) || 0);
    if (dailyRate !== undefined) user.workerProfile.dailyRate = Math.max(0, Number(dailyRate) || 0);
    if (monthlyRate !== undefined) user.workerProfile.monthlyRate = Math.max(0, Number(monthlyRate) || 0);
    if (payPreference !== undefined) user.workerProfile.payPreference = payPreference;
    if (district !== undefined) user.workerProfile.location.district = district;
    if (city !== undefined) user.workerProfile.location.city = city;
    if (Array.isArray(coordinates) && coordinates.length === 2) {
      user.workerProfile.location.geo = { type: "Point", coordinates };
    }
    if (Array.isArray(availability)) user.workerProfile.availability = availability.slice(0, 60);
    if (Array.isArray(languages)) user.workerProfile.languages = languages.slice(0, 5);
    if (experience !== undefined) user.workerProfile.experience = String(experience).slice(0, 200);
    if (voiceProfileUrl !== undefined) user.workerProfile.voiceProfileUrl = voiceProfileUrl;

    await user.save();
    res.json({ workerProfile: user.workerProfile });
  } catch (err) {
    next(err);
  }
};

// POST /api/workers/:id/unlock — vendor spends a contact credit
export const unlockWorkerContact = async (req, res, next) => {
  try {
    if (req.user.role !== "vendor" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Only vendors can unlock worker contacts" });
    }

    const worker = await User.findOne({ _id: req.params.id, role: "seeker", status: "active" }).lean();
    if (!worker) return res.status(404).json({ message: "Worker not found" });

    // Check already unlocked
    const existing = await ContactUnlock.findOne({ vendorUserId: req.user._id, workerId: worker._id });
    if (existing) {
      return res.json({ already: true, phone: worker.phone, email: worker.email });
    }

    // Check credits
    const vendorUser = await User.findById(req.user._id);
    if (vendorUser.contactCredits < 1) {
      return res.status(402).json({ message: "No contact credits. Please purchase a contact pack." });
    }

    vendorUser.contactCredits -= 1;
    await vendorUser.save();
    await ContactUnlock.create({ vendorUserId: req.user._id, workerId: worker._id });

    res.json({ unlocked: true, phone: worker.phone, email: worker.email });
  } catch (err) {
    next(err);
  }
};

// POST /api/workers/contact-packs/buy — DEPRECATED.
// Credits used to be granted here for free, which let vendors mint unlimited
// unlocks. Purchasing now goes through the paid Razorpay flow:
//   POST /api/payments/contact-pack/create-order  → pay → /verify
export const buyContactPack = async (req, res, next) => {
  return res.status(410).json({
    message: "This endpoint is deprecated. Use /api/payments/contact-pack/create-order to purchase credits.",
  });
};

// POST /api/workers/me/video — upload short intro video (premium feature)
export const uploadWorkerVideo = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!req.file) return res.status(400).json({ message: "No video file uploaded" });

    user.workerProfile.profileVideoUrl = await persistUpload(req.file, "videos");
    await user.save();
    res.json({ profileVideoUrl: user.workerProfile.profileVideoUrl });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/workers/me/video
export const removeWorkerVideo = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });
    user.workerProfile.profileVideoUrl = "";
    await user.save();
    res.json({ profileVideoUrl: "" });
  } catch (err) {
    next(err);
  }
};

// Admin: update worker verification status
export const adminVerifyWorker = async (req, res, next) => {
  try {
    const { verificationStatus, verificationBadge, featured, featuredUntil } = req.body;
    const user = await User.findById(req.params.id);
    if (!user || user.role !== "seeker") {
      return res.status(404).json({ message: "Worker not found" });
    }

    if (verificationStatus) user.workerProfile.verificationStatus = verificationStatus;
    if (typeof verificationBadge === "boolean") user.workerProfile.verificationBadge = verificationBadge;
    if (typeof featured === "boolean") user.workerProfile.featured = featured;
    if (featuredUntil) user.workerProfile.featuredUntil = new Date(featuredUntil);

    await user.save();
    res.json({ workerProfile: user.workerProfile });
  } catch (err) {
    next(err);
  }
};
