import { Router } from "express";
import {
  listWorkers,
  getWorker,
  updateMyWorkerProfile,
  uploadWorkerVideo,
  removeWorkerVideo,
  unlockWorkerContact,
  buyContactPack,
  adminVerifyWorker,
} from "../controllers/workerController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import videoUpload from "../middleware/videoUpload.js";

const router = Router();

// Specific routes first to avoid /:id swallowing them
router.get("/", listWorkers);
router.put("/me/profile", requireAuth, requireRole("seeker"), updateMyWorkerProfile);
router.post("/me/video", requireAuth, requireRole("seeker"), videoUpload.single("video"), uploadWorkerVideo);
router.delete("/me/video", requireAuth, requireRole("seeker"), removeWorkerVideo);
router.post("/contact-packs/buy", requireAuth, requireRole("vendor"), buyContactPack);

// Parameterized routes
router.get("/:id", requireAuth, getWorker);
router.post("/:id/unlock", requireAuth, unlockWorkerContact);
router.patch("/:id/verify", requireAuth, requireRole("admin"), adminVerifyWorker);

export default router;
