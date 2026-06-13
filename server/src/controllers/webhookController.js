import Webhook from "../models/Webhook.js";
import { dispatchWebhook } from "../utils/webhooks.js";

export const WEBHOOK_EVENTS = [
  "job.created",
  "application.created",
  "application.status_changed",
  "vendor.status_changed",
  "user.created",
  "payment.paid",
  "payment.refunded",
];

// GET /api/admin/webhooks
export const listWebhooks = async (req, res, next) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Webhook.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      Webhook.countDocuments(),
    ]);
    res.json({ items, total, page, pages: Math.ceil(total / limit) || 1, availableEvents: WEBHOOK_EVENTS });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/webhooks
export const createWebhook = async (req, res, next) => {
  try {
    const { url, events, secret, isActive } = req.body;
    if (!url) return res.status(400).json({ message: "url is required" });

    const webhook = await Webhook.create({
      url,
      events: Array.isArray(events) ? events.filter((e) => WEBHOOK_EVENTS.includes(e)) : [],
      secret,
      isActive: isActive !== false,
    });
    res.status(201).json({ webhook });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/webhooks/:id
export const updateWebhook = async (req, res, next) => {
  try {
    const webhook = await Webhook.findById(req.params.id);
    if (!webhook) return res.status(404).json({ message: "Webhook not found" });

    const { url, events, secret, isActive } = req.body;
    if (url) webhook.url = url;
    if (Array.isArray(events)) webhook.events = events.filter((e) => WEBHOOK_EVENTS.includes(e));
    if (typeof secret === "string") webhook.secret = secret;
    if (typeof isActive === "boolean") webhook.isActive = isActive;

    await webhook.save();
    res.json({ webhook });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admin/webhooks/:id
export const deleteWebhook = async (req, res, next) => {
  try {
    const webhook = await Webhook.findById(req.params.id);
    if (!webhook) return res.status(404).json({ message: "Webhook not found" });
    await webhook.deleteOne();
    res.json({ message: "Webhook deleted" });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/webhooks/:id/test
export const testWebhook = async (req, res, next) => {
  try {
    const webhook = await Webhook.findById(req.params.id);
    if (!webhook) return res.status(404).json({ message: "Webhook not found" });

    await dispatchWebhook("test", { message: "This is a test event from Haryana Job Marketplace" }, [webhook]);
    res.json({ message: "Test event sent" });
  } catch (err) {
    next(err);
  }
};
