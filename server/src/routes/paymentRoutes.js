import { Router } from "express";
import { createOrder, verifyPayment, razorpayWebhook } from "../controllers/paymentController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/create-order", requireAuth, createOrder);
router.post("/verify", requireAuth, verifyPayment);
// Webhook needs the raw body for signature verification; handled via express.raw in app.js
router.post("/webhook", razorpayWebhook);

export default router;
