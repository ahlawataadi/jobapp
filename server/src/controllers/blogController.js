import Blog from "../models/Blog.js";
import { dispatchWebhook } from "../utils/webhooks.js";
import { runBlogAutomationOnce } from "../jobs/blogScheduler.js";

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
