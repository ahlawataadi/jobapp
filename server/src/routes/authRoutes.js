import { Router } from "express";
import {
  register,
  login,
  refresh,
  logout,
  me,
  updateMe,
  changePassword,
  uploadAvatar,
  removeAvatar,
  forgotPassword,
  resetPassword,
  verifyOtp,
  resendOtp,
} from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";
import avatarUpload from "../middleware/avatarUpload.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);

router.get("/me", requireAuth, me);
router.patch("/me", requireAuth, updateMe);
router.post("/me/password", requireAuth, changePassword);
router.post("/me/avatar", requireAuth, avatarUpload.single("avatar"), uploadAvatar);
router.delete("/me/avatar", requireAuth, removeAvatar);

export default router;
