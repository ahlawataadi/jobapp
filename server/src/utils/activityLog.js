import geoip from "geoip-lite";
import ActivityLog from "../models/ActivityLog.js";

const getIp = (req) => {
  const fwd = req.headers["x-forwarded-for"];
  const ip = (fwd ? fwd.split(",")[0].trim() : req.ip) || "";
  return ip.replace("::ffff:", "");
};

export const logActivity = async (req, user, action) => {
  const ip = getIp(req);
  const geo = geoip.lookup(ip);
  const location = geo ? [geo.city, geo.region, geo.country].filter(Boolean).join(", ") : "";

  try {
    await ActivityLog.create({
      userId: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      action,
      ip,
      userAgent: req.headers["user-agent"] || "",
      location,
    });
  } catch {}
};
