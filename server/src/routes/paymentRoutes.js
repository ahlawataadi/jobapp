import { Router } from "express";
import {
  createOrder,
  verifyPayment,
  razorpayWebhook,
  createSubscriptionOrder,
  verifySubscriptionPayment,
} from "../controllers/paymentController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Vendor signup fee
router.post("/create-order", requireAuth, createOrder);
router.post("/verify", requireAuth, verifyPayment);

// Subscription purchase
router.post("/subscribe/create-order", requireAuth, createSubscriptionOrder);
router.post("/subscribe/verify", requireAuth, verifySubscriptionPayment);

// Razorpay webhook (raw body required — handled in app.js)
router.post("/webhook", razorpayWebhook);

export default router;
