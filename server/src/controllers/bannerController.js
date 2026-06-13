import Banner from "../models/Banner.js";

// GET /api/banners/active - public
export const getActiveBanner = async (req, res, next) => {
  try {
    const banner = await Banner.findOne({ isActive: true }).sort({ updatedAt: -1 });
    res.json({ banner });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/banners
export const listBanners = async (req, res, next) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Banner.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      Banner.countDocuments(),
    ]);
    res.json({ items, total, page, pages: Math.ceil(total / limit) || 1 });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/banners
export const createBanner = async (req, res, next) => {
  try {
    const { title, subtitle, ctaText, ctaLink, theme, isActive } = req.body;
    if (!title) return res.status(400).json({ message: "title is required" });

    const banner = await Banner.create({ title, subtitle, ctaText, ctaLink, theme, isActive });
    res.status(201).json({ banner });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/banners/:id
export const updateBanner = async (req, res, next) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) return res.status(404).json({ message: "Banner not found" });

    const allowed = ["title", "subtitle", "ctaText", "ctaLink", "theme", "isActive"];
    for (const key of allowed) {
      if (key in req.body) banner[key] = req.body[key];
    }
    await banner.save();
    res.json({ banner });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admin/banners/:id
export const deleteBanner = async (req, res, next) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) return res.status(404).json({ message: "Banner not found" });
    await banner.deleteOne();
    res.json({ message: "Banner deleted" });
  } catch (err) {
    next(err);
  }
};
