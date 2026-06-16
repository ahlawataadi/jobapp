import { Router } from "express";
import {
  getAdminConfig,
  updateAdminConfig,
  listVendors,
  updateVendorStatus,
  listUsers,
  updateUserStatus,
  setUserSubscription,
  adminCreateUser,
  adminCreateVendor,
  adminCreateJob,
  listPayments,
  refundPayment,
  updatePayment,
  importUsers,
  importVendors,
  importJobs,
  exportUsers,
  exportVendors,
  exportJobs,
  listEtlRuns,
  getIntegrationSettings,
  updateIntegrationSettings,
  uploadLogo,
  listActivityLogs,
} from "../controllers/adminController.js";
import {
  listAdminBlogs,
  getAdminBlog,
  createBlog,
  updateBlog,
  deleteBlog,
  generateBlogNow,
  importBlogs,
} from "../controllers/blogController.js";
import logoUpload from "../middleware/logoUpload.js";
import broadcastUpload from "../middleware/broadcastUpload.js";
import { listBroadcasts, createEmailBroadcast, createSmsBroadcast } from "../controllers/broadcastController.js";
import {
  listBanners,
  createBanner,
  updateBanner,
  deleteBanner,
} from "../controllers/bannerController.js";
import {
  listWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  testWebhook,
} from "../controllers/webhookController.js";
import { getAnalytics } from "../controllers/analyticsController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import csvUpload from "../middleware/csvUpload.js";

const router = Router();

// Public read of payment toggle (client needs it before vendor signup)
router.get("/config", getAdminConfig);

router.use(requireAuth, requireRole("admin"));
router.put("/config", updateAdminConfig);
router.get("/vendors", listVendors);
router.patch("/vendors/:id/status", updateVendorStatus);
router.get("/users", listUsers);
router.post("/users", adminCreateUser);
router.patch("/users/:id/status", updateUserStatus);
router.patch("/users/:id/subscription", setUserSubscription);
router.post("/vendors", adminCreateVendor);
router.post("/jobs", adminCreateJob);

router.get("/payments", listPayments);
router.post("/payments/:id/refund", refundPayment);
router.patch("/payments/:id", updatePayment);

router.post("/import/users", csvUpload.single("file"), importUsers);
router.post("/import/vendors", csvUpload.single("file"), importVendors);
router.post("/import/jobs", csvUpload.single("file"), importJobs);

router.get("/export/users", exportUsers);
router.get("/export/vendors", exportVendors);
router.get("/export/jobs", exportJobs);

// Blog management
router.get("/blog", listAdminBlogs);
router.post("/blog", createBlog);
router.post("/blog/generate", generateBlogNow);
router.post("/blog/import", csvUpload.single("file"), importBlogs);
router.get("/blog/:id", getAdminBlog);
router.patch("/blog/:id", updateBlog);
router.delete("/blog/:id", deleteBlog);

router.get("/etl/status", listEtlRuns);

router.get("/analytics", getAnalytics);
router.get("/activity-logs", listActivityLogs);
router.post("/branding/logo", logoUpload.single("logo"), uploadLogo);

router.get("/settings/integrations", getIntegrationSettings);
router.put("/settings/integrations", updateIntegrationSettings);

router.get("/banners", listBanners);
router.post("/banners", createBanner);
router.patch("/banners/:id", updateBanner);
router.delete("/banners/:id", deleteBanner);

router.get("/webhooks", listWebhooks);
router.post("/webhooks", createWebhook);
router.patch("/webhooks/:id", updateWebhook);
router.delete("/webhooks/:id", deleteWebhook);
router.post("/webhooks/:id/test", testWebhook);

router.get("/broadcasts", listBroadcasts);
router.post("/broadcasts/email", broadcastUpload.single("image"), createEmailBroadcast);
router.post("/broadcasts/sms", createSmsBroadcast);

export default router;
