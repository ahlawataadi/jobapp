import Review from "../models/Review.js";
import Vendor from "../models/Vendor.js";

const recalcAvgRating = async (vendorId) => {
  const reviews = await Review.find({ vendorId });
  const avg = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;
  await Vendor.findByIdAndUpdate(vendorId, { avgRating: Math.round(avg * 10) / 10 });
};

export const createReview = async (req, res, next) => {
  try {
    const { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "rating must be between 1 and 5" });
    }

    const vendor = await Vendor.findById(req.params.vendorId);
    if (!vendor) return res.status(404).json({ message: "Vendor not found" });

    const review = await Review.create({
      vendorId: vendor._id,
      userId: req.user._id,
      rating,
      comment,
    });

    await recalcAvgRating(vendor._id);

    res.status(201).json({ review });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "You already reviewed this vendor" });
    }
    next(err);
  }
};

export const listReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ vendorId: req.params.vendorId })
      .populate("userId", "name")
      .sort({ createdAt: -1 });
    res.json({ items: reviews });
  } catch (err) {
    next(err);
  }
};
