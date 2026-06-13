import crypto from "crypto";
import Webhook from "../models/Webhook.js";

// Fire-and-forget dispatch to all active webhooks subscribed to `event`.
export const dispatchWebhook = async (event, data, hooksOverride) => {
  try {
    const hooks = hooksOverride || (await Webhook.find({ isActive: true, events: event }));
    if (!hooks.length) return;

    const payload = JSON.stringify({ event, data, timestamp: new Date().toISOString() });

    for (const hook of hooks) {
      const headers = { "Content-Type": "application/json" };
      if (hook.secret) {
        headers["X-Webhook-Signature"] = crypto
          .createHmac("sha256", hook.secret)
          .update(payload)
          .digest("hex");
      }

      fetch(hook.url, { method: "POST", headers, body: payload })
        .then((r) => {
          hook.lastTriggeredAt = new Date();
          hook.lastStatus = String(r.status);
          hook.save().catch(() => {});
        })
        .catch((err) => {
          hook.lastTriggeredAt = new Date();
          hook.lastStatus = `error: ${err.message}`;
          hook.save().catch(() => {});
        });
    }
  } catch {
    // Webhook dispatch must never break the main request flow
  }
};
