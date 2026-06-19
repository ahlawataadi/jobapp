import { Router } from "express";
import {
  listWorkers,
  getWorker,
  updateMyWorkerProfile,
  uploadWorkerVideo,
  removeWorkerVideo,
  uploadResume,
  removeResume,
  unlockWorkerContact,
  buyContactPack,
  adminVerifyWorker,
} from "../controllers/workerController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { requireActiveSubscription } from "../utils/subscription.js";
import videoUpload from "../middleware/videoUpload.js";
import resumeUpload from "../middleware/resumeUpload.js";

const router = Router();

// Specific routes first to avoid /:id swallowing them
router.get("/", listWorkers);
router.put("/me/profile", requireAuth, requireRole("seeker"), updateMyWorkerProfile);
router.post("/me/video", requireAuth, requireRole("seeker"), requireActiveSubscription, videoUpload.single("video"), uploadWorkerVideo);
router.delete("/me/video", requireAuth, requireRole("seeker"), removeWorkerVideo);
router.post("/me/resume", requireAuth, requireRole("seeker"), resumeUpload.single("resume"), uploadResume);
router.delete("/me/resume", requireAuth, requireRole("seeker"), removeResume);
router.post("/contact-packs/buy", requireAuth, requireRole("vendor"), buyContactPack);

// Parameterized routes
router.get("/:id", requireAuth, getWorker);
router.post("/:id/unlock", requireAuth, unlockWorkerContact);
router.patch("/:id/verify", requireAuth, requireRole("admin"), adminVerifyWorker);

export default router;
