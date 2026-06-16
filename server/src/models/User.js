import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const WORKER_CATEGORIES = ["household", "home-repair", "automotive", "construction", "healthcare"];
const VERIFICATION_STATUSES = ["unverified", "pending", "verified"];

const workerProfileSchema = new mongoose.Schema(
  {
    skillCategory: { type: String, enum: WORKER_CATEGORIES, default: null },
    skills: { type: [String], default: [] },
    bio: { type: String, default: "", maxlength: 1000 },
    hourlyRate: { type: Number, default: 0 },          // ₹ per hour
    dailyRate: { type: Number, default: 0 },           // ₹ per day
    payPreference: { type: String, enum: ["hourly", "daily", "monthly", "fixed"], default: "daily" },
    voiceProfileUrl: { type: String, default: "" },    // uploaded voice intro
    location: {
      district: { type: String, default: "" },
      city: { type: String, default: "" },
      geo: {
        type: { type: String, enum: ["Point"], default: "Point" },
        coordinates: { type: [Number], default: [0, 0] },
      },
    },
    // Availability: array of ISO date strings the worker is available
    availability: { type: [String], default: [] },
    verificationStatus: { type: String, enum: VERIFICATION_STATUSES, default: "unverified" },
    verificationBadge: { type: Boolean, default: false },
    featured: { type: Boolean, default: false },
    featuredUntil: { type: Date, default: null },
    languages: { type: [String], default: ["Hindi"] },
    experience: { type: String, default: "" },        // free-text e.g. "3 years"
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["seeker", "vendor", "admin"], default: "seeker" },
    status: { type: String, enum: ["active", "suspended"], default: "active" },
    avatarUrl: { type: String, default: null },
    refreshTokenVersion: { type: Number, default: 0 },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
    isVerified: { type: Boolean, default: false },
    otpHash: { type: String, select: false },
    otpExpires: { type: Date, select: false },
    otpChannel: { type: String, enum: ["email", "phone"], select: false },

    // Seeker/worker profile (populated when role === "seeker")
    workerProfile: { type: workerProfileSchema, default: () => ({}) },

    // Vendor: contact credits for unlocking worker contact details
    contactCredits: { type: Number, default: 0, min: 0 },

    // Subscription
    subscription: {
      plan: { type: String, enum: ["none", "basic", "pro", "enterprise"], default: "none" },
      expiresAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

userSchema.index({ "workerProfile.skillCategory": 1 });
userSchema.index({ "workerProfile.location.geo": "2dsphere" });

userSchema.methods.setPassword = async function (plain) {
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(plain, salt);
};

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.methods.toSafeJSON = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    phone: this.phone,
    role: this.role,
    status: this.status,
    avatarUrl: this.avatarUrl,
    isVerified: this.isVerified,
    workerProfile: this.workerProfile,
    contactCredits: this.contactCredits,
    subscription: this.subscription,
  };
};

export default mongoose.model("User", userSchema);
