import { Router } from "express";
import {
  signupVendor,
  getMyVendor,
  getVendorPublic,
  uploadVendorDocuments,
  uploadVendorLogo,
  removeVendorLogo,
  uploadVendorVideo,
  removeVendorVideo,
  addBusiness,
  removeBusiness,
  getFeaturedVendors,
} from "../controllers/vendorController.js";
import { requireAuth } from "../middleware/auth.js";
import upload from "../middleware/upload.js";
import avatarUpload from "../middleware/avatarUpload.js";
import videoUpload from "../middleware/videoUpload.js";

const router = Router();

router.post("/signup", requireAuth, signupVendor);
router.get("/me", requireAuth, getMyVendor);
router.get("/featured", getFeaturedVendors);
router.post("/me/documents", requireAuth, upload.array("documents", 5), uploadVendorDocuments);
router.post("/me/logo", requireAuth, avatarUpload.single("logo"), uploadVendorLogo);
router.delete("/me/logo", requireAuth, removeVendorLogo);
router.post("/me/video", requireAuth, videoUpload.single("video"), uploadVendorVideo);
router.delete("/me/video", requireAuth, removeVendorVideo);
router.post("/me/businesses", requireAuth, addBusiness);
router.delete("/me/businesses/:id", requireAuth, removeBusiness);
router.get("/:id", getVendorPublic);

export default router;
