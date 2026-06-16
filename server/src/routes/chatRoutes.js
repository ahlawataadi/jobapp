import { Router } from "express";
import {
  listConversations,
  getConversation,
  sendMessage,
  unreadCount,
} from "../controllers/chatController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/", listConversations);
router.get("/unread-count", unreadCount);
router.get("/:userId", getConversation);
router.post("/:userId", sendMessage);

export default router;
