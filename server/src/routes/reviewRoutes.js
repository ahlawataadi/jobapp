import { Router } from "express";
import { createReview, listReviews } from "../controllers/reviewController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/:vendorId", listReviews);
router.post("/:vendorId", requireAuth, createReview);

export default router;
