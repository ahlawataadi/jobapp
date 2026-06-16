import ChatMessage from "../models/ChatMessage.js";
import User from "../models/User.js";

// Regex patterns that match contact info — stripped from all messages.
const CONTACT_PATTERNS = [
  /(\+91|0091|0)?[6-9]\d{9}/g,                              // Indian mobile numbers
  /\b\d{10,12}\b/g,                                          // generic 10-12 digit numbers
  /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g, // emails
  /\bwhatsapp\.com\/[^\s]*/gi,                               // WhatsApp links
  /\bt\.me\/[^\s]*/gi,                                       // Telegram links
];

function sanitize(text) {
  let out = text;
  for (const re of CONTACT_PATTERNS) {
    out = out.replace(re, "[contact removed]");
  }
  return out;
}

// GET /api/chat — list all conversations for the current user
export const listConversations = async (req, res, next) => {
  try {
    // Find the latest message in each conversation
    const userId = req.user._id;
    const msgs = await ChatMessage.aggregate([
      { $match: { $or: [{ fromId: userId }, { toId: userId }] } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: {
            $cond: [{ $lt: ["$fromId", "$toId"] }, { a: "$fromId", b: "$toId" }, { a: "$toId", b: "$fromId" }],
          },
          lastMessage: { $first: "$$ROOT" },
        },
      },
      { $replaceRoot: { newRoot: "$lastMessage" } },
      { $sort: { createdAt: -1 } },
      { $limit: 30 },
    ]);

    // Populate other user info
    const otherIds = msgs.map((m) => (String(m.fromId) === String(userId) ? m.toId : m.fromId));
    const others = await User.find({ _id: { $in: otherIds } }).select("name avatarUrl role").lean();
    const othersMap = Object.fromEntries(others.map((u) => [String(u._id), u]));

    const conversations = msgs.map((m) => {
      const otherId = String(m.fromId) === String(userId) ? m.toId : m.fromId;
      return { ...m, other: othersMap[String(otherId)] };
    });

    res.json({ conversations });
  } catch (err) {
    next(err);
  }
};

// GET /api/chat/:userId — get message thread with one user
export const getConversation = async (req, res, next) => {
  try {
    const me = req.user._id;
    const other = req.params.userId;
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const skip = (page - 1) * limit;

    const filter = {
      $or: [
        { fromId: me, toId: other },
        { fromId: other, toId: me },
      ],
    };

    const [messages, total] = await Promise.all([
      ChatMessage.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      ChatMessage.countDocuments(filter),
    ]);

    // Mark incoming messages as read
    await ChatMessage.updateMany({ fromId: other, toId: me, read: false }, { $set: { read: true } });

    const otherUser = await User.findById(other).select("name avatarUrl role").lean();

    res.json({ messages: messages.reverse(), other: otherUser, total, page, pages: Math.ceil(total / limit) || 1 });
  } catch (err) {
    next(err);
  }
};

// POST /api/chat/:userId — send a message
export const sendMessage = async (req, res, next) => {
  try {
    const fromId = req.user._id;
    const toId = req.params.userId;

    if (String(fromId) === String(toId)) {
      return res.status(400).json({ message: "Cannot message yourself" });
    }

    const toUser = await User.findById(toId).select("_id status").lean();
    if (!toUser || toUser.status !== "active") {
      return res.status(404).json({ message: "Recipient not found" });
    }

    const raw = String(req.body.content || "").trim();
    if (!raw) return res.status(400).json({ message: "Message content is required" });
    if (raw.length > 2000) return res.status(400).json({ message: "Message too long (max 2000 chars)" });

    const content = sanitize(raw);

    const message = await ChatMessage.create({ fromId, toId, content });
    res.status(201).json({ message });
  } catch (err) {
    next(err);
  }
};

// GET /api/chat/unread-count
export const unreadCount = async (req, res, next) => {
  try {
    const count = await ChatMessage.countDocuments({ toId: req.user._id, read: false });
    res.json({ count });
  } catch (err) {
    next(err);
  }
};
