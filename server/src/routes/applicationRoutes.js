import { Router } from "express";
import { myApplications, updateApplicationStatus } from "../controllers/applicationController.js";
import { requireAuth, requireRole, requireVendor } from "../middleware/auth.js";

const router = Router();

router.get("/mine", requireAuth, myApplications);
router.patch("/:id/status", requireAuth, requireRole("vendor"), requireVendor, updateApplicationStatus);

export default router;
