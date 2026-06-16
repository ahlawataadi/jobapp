import { Router } from "express";
import { whatsappWebhook } from "../controllers/whatsappController.js";

const router = Router();

// Twilio sends webhook events here (inbound messages, delivery status).
// Set the webhook URL in the Twilio console or Meta WhatsApp config to:
//   POST https://your-domain.com/api/whatsapp/webhook
router.post("/webhook", whatsappWebhook);

export default router;
