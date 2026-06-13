import Application from "../models/Application.js";
import Job from "../models/Job.js";
import { dispatchWebhook } from "../utils/webhooks.js";
import { sendMail } from "../utils/mailer.js";

export const applyToJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found" });
    if (job.status !== "open") return res.status(400).json({ message: "Job is closed" });

    const application = await Application.create({
      jobId: job._id,
      userId: req.user._id,
      resumeUrl: req.body.resumeUrl,
      coverNote: req.body.coverNote,
    });

    dispatchWebhook("application.created", {
      applicationId: application._id,
      jobId: job._id,
      jobTitle: job.title,
      userId: req.user._id,
    });
    res.status(201).json({ application });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "You have already applied to this job" });
    }
    next(err);
  }
};

export const myApplications = async (req, res, next) => {
  try {
    const applications = await Application.find({ userId: req.user._id })
      .populate("jobId")
      .sort({ createdAt: -1 });
    res.json({ items: applications });
  } catch (err) {
    next(err);
  }
};

// Vendor: list applicants for a job they own
export const jobApplicants = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found" });
    if (job.vendorId.toString() !== req.vendor._id.toString()) {
      return res.status(403).json({ message: "Not your job posting" });
    }

    const applications = await Application.find({ jobId: job._id })
      .populate("userId", "name email phone")
      .sort({ createdAt: -1 });

    res.json({ items: applications });
  } catch (err) {
    next(err);
  }
};

export const updateApplicationStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!["applied", "shortlisted", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const application = await Application.findById(req.params.id).populate("jobId").populate("userId", "name email");
    if (!application) return res.status(404).json({ message: "Application not found" });

    if (application.jobId.vendorId.toString() !== req.vendor._id.toString()) {
      return res.status(403).json({ message: "Not your job posting" });
    }

    application.status = status;
    await application.save();

    if (application.userId?.email) {
      const statusText = { shortlisted: "shortlisted", rejected: "not selected", applied: "received" }[status];
      sendMail({
        to: application.userId.email,
        subject: `Application update: ${application.jobId.title}`,
        html: `<p>Hi ${application.userId.name || ""},</p><p>Your application for <strong>${application.jobId.title}</strong> has been <strong>${statusText}</strong>.</p>`,
      }).catch(() => {});
    }

    dispatchWebhook("application.status_changed", {
      applicationId: application._id,
      jobId: application.jobId._id,
      userId: application.userId,
      status,
    });
    res.json({ application });
  } catch (err) {
    next(err);
  }
};
