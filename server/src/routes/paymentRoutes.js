import { Router } from "express";
import {
  createOrder,
  verifyPayment,
  razorpayWebhook,
  createSubscriptionOrder,
  verifySubscriptionPayment,
  createContactPackOrder,
  verifyContactPackPurchase,
  createSeekerSignupOrder,
  verifySeekerSignupPayment,
} from "../controllers/paymentController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Vendor signup fee
router.post("/create-order", requireAuth, createOrder);
router.post("/verify", requireAuth, verifyPayment);

// Seeker signup fee
router.post("/seeker-signup/create-order", requireAuth, createSeekerSignupOrder);
router.post("/seeker-signup/verify", requireAuth, verifySeekerSignupPayment);

// Subscription purchase
router.post("/subscribe/create-order", requireAuth, createSubscriptionOrder);
router.post("/subscribe/verify", requireAuth, verifySubscriptionPayment);

// Contact-pack purchase (credits granted only after payment verification)
router.post("/contact-pack/create-order", requireAuth, createContactPackOrder);
router.post("/contact-pack/verify", requireAuth, verifyContactPackPurchase);

// Razorpay webhook (raw body required — handled in app.js)
router.post("/webhook", razorpayWebhook);

export default router;
