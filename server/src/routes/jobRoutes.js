import { Router } from "express";
import {
  createJob,
  listJobs,
  getJob,
  updateJob,
  deleteJob,
  listMyJobs,
  compareJobs,
  suggestJobs,
  districtStats,
  importMyJobs,
  listSavedJobs,
  saveJob,
  unsaveJob,
} from "../controllers/jobController.js";
import { applyToJob, jobApplicants } from "../controllers/applicationController.js";
import { requireAuth, requireRole, requireVendor } from "../middleware/auth.js";
import csvUpload from "../middleware/csvUpload.js";

const router = Router();

router.get("/", listJobs);
router.get("/suggest", suggestJobs);
router.get("/stats/districts", districtStats);
router.post("/compare", compareJobs);
router.get("/saved/me", requireAuth, listSavedJobs);
router.get("/mine", requireAuth, requireRole("vendor"), requireVendor, listMyJobs);
router.post(
  "/import",
  requireAuth,
  requireRole("vendor"),
  requireVendor,
  csvUpload.single("file"),
  importMyJobs
);

router.post("/", requireAuth, requireRole("vendor"), requireVendor, createJob);
router.get("/:id", getJob);
router.put("/:id", requireAuth, requireRole("vendor"), requireVendor, updateJob);
router.delete("/:id", requireAuth, requireRole("vendor"), requireVendor, deleteJob);

router.post("/:id/apply", requireAuth, requireRole("seeker", "vendor"), applyToJob);
router.get("/:id/applicants", requireAuth, requireRole("vendor"), requireVendor, jobApplicants);

router.post("/:id/save", requireAuth, saveJob);
router.delete("/:id/save", requireAuth, unsaveJob);

export default router;
