import User from "../models/User.js";
import Job from "../models/Job.js";

// WhatsApp webhook — receives status/reply events from Twilio or WhatsApp Business API.
// Set your webhook URL to: POST /api/whatsapp/webhook
//
// To broadcast a new job to nearby workers via WhatsApp, call broadcastJobToWorkers()
// from your job creation flow. Requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,
// and TWILIO_WHATSAPP_FROM to be set.

async function twilioClient() {
  const { TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: token } = process.env;
  if (!sid || !token) return null;
  const { default: twilio } = await import("twilio");
  return twilio(sid, token);
}

// POST /api/whatsapp/webhook — Twilio webhook for inbound messages / status callbacks
export const whatsappWebhook = async (req, res) => {
  // Acknowledge immediately so Twilio doesn't retry
  res.set("Content-Type", "text/xml").send("<Response></Response>");

  const { Body, From, WaId } = req.body;
  if (!Body) return;

  const normalized = String(WaId || From).replace(/\D/g, "").slice(-10);
  const user = await User.findOne({ phone: { $regex: normalized } }).lean();
  if (!user) return;

  // Auto-reply: job seekers can text "JOBS" to receive the latest listings
  if (Body.trim().toLowerCase() === "jobs") {
    const jobs = await Job.find({ status: "open" }).sort({ createdAt: -1 }).limit(5).lean();
    const text = jobs.length
      ? `*Latest jobs:*\n\n${jobs.map((j, i) => `${i + 1}. ${j.title} — ${j.location?.district || "India"}`).join("\n")}\n\nReply STOP to unsubscribe.`
      : "No jobs listed right now. Check back soon!";
    await sendWhatsApp(From, text);
  }
};

async function sendWhatsApp(to, body) {
  const client = await twilioClient();
  if (!client) {
    console.warn("[whatsapp] Twilio not configured — skipping send");
    return;
  }
  const from = process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886";
  await client.messages.create({ from, to: `whatsapp:${to}`, body });
}

// Broadcast a new job listing to workers in the same district via WhatsApp.
// Call this after creating a job (or from a webhook trigger).
export async function broadcastJobToWorkers(job) {
  if (!process.env.TWILIO_ACCOUNT_SID) return; // not configured — skip silently

  const workers = await User.find({
    role: "seeker",
    status: "active",
    phone: { $exists: true, $ne: "" },
    "workerProfile.skillCategory": { $exists: true },
    $or: [
      { "workerProfile.location.district": job.location?.district },
      { "workerProfile.location.district": { $exists: false } },
    ],
  })
    .select("phone name")
    .limit(100)
    .lean();

  const msg =
    `*New job alert!*\n` +
    `*${job.title}*\n` +
    `📍 ${job.location?.district || "India"}\n` +
    `💰 ${job.category || "General"}\n\n` +
    `Reply JOBS to see all open positions.`;

  const sends = workers
    .filter((w) => w.phone)
    .map((w) => sendWhatsApp(w.phone, msg).catch((e) => console.warn("[whatsapp] send failed:", e.message)));

  await Promise.allSettled(sends);
  console.log(`[whatsapp] broadcast sent to ${sends.length} workers for job "${job.title}"`);
}
