import User from "../models/User.js";
import Broadcast from "../models/Broadcast.js";
import { sendMail } from "../utils/mailer.js";
import { sendSms } from "../utils/sms.js";
import { persistUpload } from "../utils/storage.js";

const audienceFilter = (audience) => {
  if (audience === "seekers") return { role: "seeker" };
  if (audience === "vendors") return { role: "vendor" };
  return { role: { $in: ["seeker", "vendor"] } };
};

export const listBroadcasts = async (req, res, next) => {
  try {
    const { channel } = req.query;
    const filter = {};
    if (channel === "email" || channel === "sms") filter.channel = channel;

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const [broadcasts, total] = await Promise.all([
      Broadcast.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Broadcast.countDocuments(filter),
    ]);
    res.json({ broadcasts, total, page, pages: Math.ceil(total / limit) || 1 });
  } catch (err) {
    next(err);
  }
};

export const createEmailBroadcast = async (req, res, next) => {
  try {
    const { title, description, audience } = req.body;
    if (!title || !audience) return res.status(400).json({ message: "title and audience are required" });

    const recipients = await User.find(audienceFilter(audience)).select("email name");
    const imageUrl = req.file ? await persistUpload(req.file, "broadcasts") : "";
    const origin = req.headers.origin || "";
    // R2 returns an absolute URL; local storage returns a relative path needing the origin.
    const imageSrc = imageUrl && /^https?:\/\//.test(imageUrl) ? imageUrl : `${origin}${imageUrl}`;

    const broadcast = await Broadcast.create({
      channel: "email",
      title,
      description: description || "",
      imageUrl,
      audience,
      recipientCount: recipients.length,
      createdBy: req.user._id,
    });

    let sentCount = 0;
    for (const recipient of recipients) {
      const html = `
        <h2>${title}</h2>
        ${imageUrl ? `<img src="${imageSrc}" alt="" style="max-width:100%;" />` : ""}
        <p>${(description || "").replace(/\n/g, "<br/>")}</p>
      `;
      const { sent } = await sendMail({ to: recipient.email, subject: title, html });
      if (sent) sentCount += 1;
    }

    broadcast.sentCount = sentCount;
    await broadcast.save();

    res.status(201).json({ broadcast });
  } catch (err) {
    next(err);
  }
};

export const createSmsBroadcast = async (req, res, next) => {
  try {
    const { title, description, audience } = req.body;
    if (!title || !audience) return res.status(400).json({ message: "title and audience are required" });

    const recipients = await User.find({ ...audienceFilter(audience), phone: { $exists: true, $ne: "" } }).select("phone");

    const broadcast = await Broadcast.create({
      channel: "sms",
      title,
      description: description || "",
      audience,
      recipientCount: recipients.length,
      createdBy: req.user._id,
    });

    const message = `${title}${description ? " - " + description : ""}`;
    let sentCount = 0;
    for (const recipient of recipients) {
      const { sent } = await sendSms({ to: recipient.phone, message });
      if (sent) sentCount += 1;
    }

    broadcast.sentCount = sentCount;
    await broadcast.save();

    res.status(201).json({ broadcast });
  } catch (err) {
    next(err);
  }
};
