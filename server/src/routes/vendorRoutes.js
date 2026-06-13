import { Router } from "express";
import {
  signupVendor,
  getMyVendor,
  getVendorPublic,
  uploadVendorDocuments,
  uploadVendorLogo,
  removeVendorLogo,
  getFeaturedVendors,
} from "../controllers/vendorController.js";
import { requireAuth } from "../middleware/auth.js";
import upload from "../middleware/upload.js";
import avatarUpload from "../middleware/avatarUpload.js";

const router = Router();

router.post("/signup", requireAuth, signupVendor);
router.get("/me", requireAuth, getMyVendor);
router.get("/featured", getFeaturedVendors);
router.post("/me/documents", requireAuth, upload.array("documents", 5), uploadVendorDocuments);
router.post("/me/logo", requireAuth, avatarUpload.single("logo"), uploadVendorLogo);
router.delete("/me/logo", requireAuth, removeVendorLogo);
router.get("/:id", getVendorPublic);

export default router;
