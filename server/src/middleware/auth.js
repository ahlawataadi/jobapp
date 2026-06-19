import { verifyAccessToken } from "../utils/tokens.js";
import User from "../models/User.js";
import Vendor from "../models/Vendor.js";

export const requireAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: "Not authenticated" });

    const payload = verifyAccessToken(token);
    // Exclude the password hash from the request-scoped user. Handlers that need
    // it (e.g. password change) re-fetch the full document explicitly.
    const user = await User.findById(payload.sub).select("-passwordHash");
    if (!user) return res.status(401).json({ message: "User not found" });

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
};

// Loads req.vendor for the logged-in vendor user, 404 if not found
export const requireVendor = async (req, res, next) => {
  try {
    const vendor = await Vendor.findOne({ userId: req.user._id });
    if (!vendor) return res.status(404).json({ message: "Vendor profile not found" });
    req.vendor = vendor;
    next();
  } catch (err) {
    next(err);
  }
};
