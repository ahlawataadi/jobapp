import Blog from "../models/Blog.js";
import { dispatchWebhook } from "../utils/webhooks.js";
import { runBlogAutomationOnce } from "../jobs/blogScheduler.js";
import { parseCsv } from "../utils/csv.js";

const slugify = (s) =>
  String(s || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || `post-${Date.now()}`;

async function uniqueSlug(base, ignoreId) {
  let slug = slugify(base);
  let n = 0;
  // eslint-disable-next-line no-await-in-loop
  while (await Blog.exists({ slug, ...(ignoreId ? { _id: { $ne: ignoreId } } : {}) })) {
    n += 1;
    slug = `${slugify(base)}-${n}`;
  }
  return slug;
}

const paginate = (query) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 50);
  return { page, limit, skip: (page - 1) * limit };
};

/* ---------------- Public ---------------- */

// GET /api/blog?page&limit&tag&q
export const listPublishedBlogs = async (req, res, next) => {
  try {
    const { tag, q } = req.query;
    const filter = { status: "published" };
    if (tag) filter.tags = tag;
    if (q) filter.$text = { $search: q };

    const { page, limit, skip } = paginate(req.query);
    const [items, total] = await Promise.all([
      Blog.find(filter)
        .select("-content")
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Blog.countDocuments(filter),
    ]);

    res.json({ items, total, page, pages: Math.ceil(total / limit) || 1 });
  } catch (err) {
    next(err);
  }
};

// GET /api/blog/:slug
export const getBlogBySlug = async (req, res, next) => {
  try {
    const post = await Blog.findOne({ slug: req.params.slug, status: "published" });
    if (!post) return res.status(404).json({ message: "Post not found" });
    res.json({ post });
  } catch (err) {
    next(err);
  }
};

/* ---------------- Admin ---------------- */

// GET /api/admin/blog?status&q&page&limit
export const listAdminBlogs = async (req, res, next) => {
  try {
    const { status, q } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (q) filter.$text = { $search: q };

    const { page, limit, skip } = paginate(req.query);
    const [items, total] = await Promise.all([
      Blog.find(filter).select("-content").sort({ updatedAt: -1 }).skip(skip).limit(limit),
      Blog.countDocuments(filter),
    ]);
    res.json({ items, total, page, pages: Math.ceil(total / limit) || 1 });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/blog/:id
export const getAdminBlog = async (req, res, next) => {
  try {
    const post = await Blog.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    res.json({ post });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/blog
export const createBlog = async (req, res, next) => {
  try {
    const { title, content, excerpt, coverImage, tags, category, status, slug, seo } = req.body;
    if (!title || !content) {
      return res.status(400).json({ message: "title and content are required" });
    }

    const finalStatus = status === "published" ? "published" : "draft";
    const post = await Blog.create({
      title,
      slug: await uniqueSlug(slug || title),
      content,
      excerpt: excerpt || "",
      coverImage: coverImage || "",
      tags: Array.isArray(tags) ? tags : String(tags || "").split(",").map((t) => t.trim()).filter(Boolean),
      category: category || "",
      status: finalStatus,
      authorId: req.user?._id,
      authorName: req.user?.name || "Admin",
      seo: { metaTitle: seo?.metaTitle || "", metaDescription: seo?.metaDescription || "" },
      publishedAt: finalStatus === "published" ? new Date() : undefined,
    });

    dispatchWebhook("blog.created", { blogId: post._id, title: post.title, status: post.status });
    res.status(201).json({ post });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/blog/:id
export const updateBlog = async (req, res, next) => {
  try {
    const post = await Blog.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const { title, content, excerpt, coverImage, tags, category, status, slug, seo } = req.body;
    if (title !== undefined) post.title = title;
    if (content !== undefined) post.content = content;
    if (excerpt !== undefined) post.excerpt = excerpt;
    if (coverImage !== undefined) post.coverImage = coverImage;
    if (category !== undefined) post.category = category;
    if (tags !== undefined) {
      post.tags = Array.isArray(tags) ? tags : String(tags).split(",").map((t) => t.trim()).filter(Boolean);
    }
    if (slug !== undefined && slug) post.slug = await uniqueSlug(slug, post._id);
    if (seo && typeof seo === "object") {
      post.seo = {
        metaTitle: seo.metaTitle ?? post.seo?.metaTitle ?? "",
        metaDescription: seo.metaDescription ?? post.seo?.metaDescription ?? "",
      };
    }
    if (status && ["draft", "published"].includes(status)) {
      if (status === "published" && post.status !== "published") post.publishedAt = new Date();
      post.status = status;
    }

    await post.save();
    res.json({ post });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admin/blog/:id
export const deleteBlog = async (req, res, next) => {
  try {
    const post = await Blog.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    await post.deleteOne();
    res.json({ message: "Post deleted" });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/blog/generate — run the automation once, on demand.
// Honors BLOG_AUTOMATION_STATUS (defaults to a draft for review).
export const generateBlogNow = async (req, res, next) => {
  try {
    const post = await runBlogAutomationOnce();
    res.status(201).json({ post });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/blog/import — multipart CSV field "file"
// CSV columns: title, content, excerpt, coverImage, category, tags (comma-sep), status
export const importBlogs = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "CSV file is required" });

    const rows = parseCsv(req.file.buffer.toString("utf8"));
    const results = { created: 0, skipped: 0, errors: [] };

    for (const row of rows) {
      try {
        if (!row.title || !row.content) {
          results.skipped += 1;
          continue;
        }
        const finalStatus = row.status === "published" ? "published" : "draft";
        // eslint-disable-next-line no-await-in-loop
        await Blog.create({
          title: row.title,
          // eslint-disable-next-line no-await-in-loop
          slug: await uniqueSlug(row.slug || row.title),
          content: row.content,
          excerpt: row.excerpt || "",
          coverImage: row.coverImage || "",
          tags: row.tags ? row.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
          category: row.category || "",
          status: finalStatus,
          authorId: req.user?._id,
          authorName: req.user?.name || "Admin",
          publishedAt: finalStatus === "published" ? new Date() : undefined,
        });
        results.created += 1;
      } catch (e) {
        results.errors.push(e.message);
      }
    }

    res.json(results);
  } catch (err) {
    next(err);
  }
};

const SAMPLE_BLOGS = [
  {
    title: "Top 5 In-Demand Skills in Haryana 2025",
    slug: "top-5-in-demand-skills-haryana-2025",
    excerpt: "From electricians to home nurses, discover which worker skills are most sought after across Haryana districts this year.",
    content: `<h2>The Job Market is Changing Fast</h2><p>Haryana's rapid urbanisation and growing middle class have created strong demand for skilled tradespeople and domestic workers. Here are the five most in-demand skills right now.</p><h3>1. Electricians</h3><p>With new housing societies coming up in Gurugram, Faridabad and Panchkula, qualified electricians are in short supply. Daily rates have risen to ₹1,500–₹2,500.</p><h3>2. Home Nurses / Patient Care</h3><p>An ageing population means elder care is booming. Trained nurses can command ₹2,000–₹3,500 per day for home visits.</p><h3>3. Plumbers</h3><p>Infrastructure expansion means constant demand. Plumbers in Rohtak and Hisar earn ₹1,500–₹2,000 daily.</p><h3>4. Auto Mechanics</h3><p>Two-wheeler and four-wheeler penetration is high. Multi-brand mechanics rarely sit idle.</p><h3>5. Cooks / Domestic Helpers</h3><p>Dual-income households need reliable household help. Experienced cooks earn ₹800–₹1,500 per day.</p>`,
    tags: ["skills", "haryana", "jobs", "2025"], category: "Career Advice", status: "published",
    publishedAt: new Date(Date.now() - 3 * 864e5),
  },
  {
    title: "How to Find Daily Wage Work Near You",
    slug: "how-to-find-daily-wage-work-near-you",
    excerpt: "A step-by-step guide for daily wage workers to find legitimate employers, avoid scams, and get paid on time.",
    content: `<h2>Finding Work Has Never Been Easier</h2><p>Gone are the days of standing at a labour chowk hoping for work. Digital platforms now connect daily wage workers directly with employers in their area.</p><h3>Step 1: Create a Profile</h3><p>List your skills, your district, and your daily rate. A complete profile gets 3x more enquiries than an empty one.</p><h3>Step 2: Set Your Availability</h3><p>Mark the days you're free. Employers filter by availability, so keeping it updated is crucial.</p><h3>Step 3: Respond Quickly</h3><p>First response often wins the job. Enable notifications so you're alerted immediately.</p><h3>Step 4: Use In-App Chat</h3><p>Negotiate terms safely through the platform's messaging system.</p><h3>Step 5: Build Reviews</h3><p>After each job, ask the employer to leave a review. Positive reviews unlock better-paying opportunities.</p>`,
    tags: ["daily-wage", "tips", "workers"], category: "Worker Guide", status: "published",
    publishedAt: new Date(Date.now() - 7 * 864e5),
  },
  {
    title: "Hiring a Maid or Cook in Gurugram: What to Expect",
    slug: "hiring-maid-cook-gurugram-guide",
    excerpt: "A practical guide for families looking to hire domestic help in Gurugram — rates, background checks, and best practices.",
    content: `<h2>Domestic Help in Gurugram</h2><p>Finding reliable household help in Gurugram is a common challenge. This guide covers everything you need to know.</p><h3>Market Rates (2025)</h3><ul><li>Part-time maid (2 hrs/day): ₹3,000–₹5,000/month</li><li>Full-time cook: ₹8,000–₹15,000/month</li><li>Live-in housekeeper: ₹12,000–₹20,000/month</li></ul><h3>What to Check</h3><p>Always verify Aadhaar ID. Ask for references from previous employers.</p><h3>Payment</h3><p>Agree on salary day in advance. Digital transfers (UPI) are preferred over cash for a paper trail.</p>`,
    tags: ["domestic-help", "gurugram", "hiring-guide"], category: "Employer Guide", status: "published",
    publishedAt: new Date(Date.now() - 14 * 864e5),
  },
  {
    title: "Understanding Gig Work: Hourly vs Daily vs Fixed Price",
    slug: "gig-work-hourly-daily-fixed-price-explained",
    excerpt: "Not sure which pay structure to offer or accept? This breakdown helps both workers and employers choose the right model.",
    content: `<h2>Gig Work Pay Structures</h2><p>The rise of on-demand and freelance work has created multiple pay models.</p><h3>Hourly Rate</h3><p><strong>Best for:</strong> Short tasks with unpredictable durations. <strong>Typical range:</strong> ₹150–₹500/hr.</p><h3>Daily Rate</h3><p><strong>Best for:</strong> Full-day engagements like construction or event cooking. <strong>Typical range:</strong> ₹700–₹2,500/day.</p><h3>Fixed Price</h3><p><strong>Best for:</strong> Well-defined deliverables. Agree on scope upfront to avoid disputes.</p><h3>Monthly Retainer</h3><p><strong>Best for:</strong> Recurring help like office cleaning contracts. Provides income stability.</p>`,
    tags: ["gig-work", "freelance", "pay-structure"], category: "Career Advice", status: "published",
    publishedAt: new Date(Date.now() - 10 * 864e5),
  },
  {
    title: "Safety Tips for Workers Meeting Clients for the First Time",
    slug: "safety-tips-workers-meeting-clients",
    excerpt: "Your safety matters. Follow these simple steps before accepting a new job through any platform.",
    content: `<h2>Stay Safe When Starting a New Job</h2><p>Whether you're an electrician, nurse, or domestic helper, meeting a new client always carries some risk.</p><h3>1. Verify the Employer</h3><p>Check the employer's profile rating and reviews. Verified employers have completed an ID check.</p><h3>2. Share Your Itinerary</h3><p>Tell a trusted family member where you're going and when you expect to return.</p><h3>3. Keep Chats on the Platform</h3><p>Don't move to WhatsApp until you're confident about the employer.</p><h3>4. Don't Share Bank Details Upfront</h3><p>Legitimate employers pay after work is done. Anyone asking for your account details before the job is a red flag.</p>`,
    tags: ["safety", "workers", "tips"], category: "Worker Guide", status: "published",
    publishedAt: new Date(Date.now() - 5 * 864e5),
  },
];

export const seedSampleBlogs = async (req, res, next) => {
  try {
    let created = 0;
    for (const b of SAMPLE_BLOGS) {
      const exists = await Blog.findOne({ slug: b.slug });
      if (!exists) {
        await Blog.create({ ...b, authorId: req.user?._id, authorName: req.user?.name || "Admin" });
        created++;
      }
    }
    res.json({ created, message: created > 0 ? `${created} sample blog posts added.` : "All sample posts already exist." });
  } catch (err) { next(err); }
};
