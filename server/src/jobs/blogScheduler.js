import cron from "node-cron";
import Blog from "../models/Blog.js";
import User from "../models/User.js";
import Job from "../models/Job.js";

// Server-side blog automation. Disabled unless BLOG_AUTOMATION_ENABLED=true.
//
// Scheduling:
//   BLOG_AUTOMATION_ENABLED  "true" to enable the cron job
//   BLOG_AUTOMATION_CRON     cron expression (default "0 9 * * *" — 09:00 daily)
//   BLOG_AUTOMATION_STATUS   "published" to go live immediately (default "draft")
//
// AI content (optional — falls back to a real data digest if unset):
//   BLOG_AI_PROVIDER         "anthropic" | "openai" (auto-detected from keys if unset)
//   BLOG_AI_MODEL            model id (defaults: claude-haiku-4-5-20251001 / gpt-4o-mini)
//   ANTHROPIC_API_KEY / OPENAI_API_KEY
//
// This is an India-wide marketplace: grounding data is aggregated across the
// whole country, never filtered to a single state or district.

const PAY_SUFFIX = { month: "/mo", hour: "/hr", day: "/day", fixed: "" };

const ANGLES = [
  "Top in-demand jobs across India this week",
  "Hourly vs. daily-wage roles: a guide for Indian job seekers",
  "How employers across India can hire on-demand and freelance workers",
  "Resume and interview tips for first-time job seekers in India",
  "Which job categories are hiring the most right now in India",
];

const slugify = (s) =>
  String(s || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || `post-${Date.now()}`;

async function uniqueSlug(base) {
  let slug = slugify(base);
  let n = 0;
  // eslint-disable-next-line no-await-in-loop
  while (await Blog.exists({ slug })) {
    n += 1;
    slug = `${slugify(base)}-${n}`;
  }
  return slug;
}

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function fmtPay(j) {
  const suffix = PAY_SUFFIX[j.payUnit] ?? "";
  const f = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
  if (!j.salaryMin && !j.salaryMax) return j.payUnit === "fixed" ? "Negotiable" : "—";
  if (j.salaryMin && j.salaryMax && j.salaryMin !== j.salaryMax) return `${f(j.salaryMin)}–${f(j.salaryMax)}${suffix}`;
  return `${f(j.salaryMax || j.salaryMin)}${suffix}`;
}

// Gather live, India-wide grounding data from the database.
async function gatherContext() {
  const [recent, byCategory, byLocation, openCount] = await Promise.all([
    Job.find({ status: "open" })
      .sort({ createdAt: -1 })
      .limit(12)
      .select("title category jobType payUnit salaryMin salaryMax location.city location.district")
      .lean(),
    Job.aggregate([
      { $match: { status: "open" } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 },
    ]),
    Job.aggregate([
      { $match: { status: "open" } },
      { $group: { _id: { $ifNull: ["$location.city", "$location.district"] }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 },
    ]),
    Job.countDocuments({ status: "open" }),
  ]);
  return { recent, byCategory, byLocation, openCount };
}

function buildPrompt(ctx, angle) {
  const cats = ctx.byCategory.filter((c) => c._id).map((c) => `${c._id} (${c.count})`).join(", ");
  const locs = ctx.byLocation.filter((l) => l._id).map((l) => `${l._id} (${l.count})`).join(", ");
  const jobs = ctx.recent
    .map((j) => `- ${j.title} [${j.category || "general"}, ${j.jobType}, ${j.location?.city || j.location?.district || "India"}, ${fmtPay(j)}]`)
    .join("\n");

  return `You are writing for an India-wide job marketplace (it is NOT limited to any single state or district — treat the audience as all of India).
Write an original, genuinely useful blog post for the angle: "${angle}".

Use this live marketplace data as grounding (do not invent figures beyond it):
- Open jobs right now: ${ctx.openCount}
- Top hiring categories: ${cats || "n/a"}
- Active locations across India: ${locs || "n/a"}
- Recent listings:
${jobs || "none yet"}

Keep it practical and specific to Indian job seekers and employers; reference the data above where useful. Around 500-700 words.

Return ONLY a JSON object (no markdown code fences) with these keys:
{"title": string, "excerpt": string (max 160 chars), "contentHtml": string (HTML using only <h2>, <p>, <ul>, <li>, <strong>), "tags": string[]}`;
}

// Calls Anthropic or OpenAI via plain fetch (no SDK dependency). Returns the
// raw text response, or null if no provider/key is configured.
async function callLLM(prompt) {
  const provider = (process.env.BLOG_AI_PROVIDER || "").toLowerCase();
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const useAnthropic = (provider === "anthropic" || (!provider && anthropicKey)) && anthropicKey;
  const useOpenAI = (provider === "openai" || (!provider && openaiKey)) && openaiKey;
  if (!useAnthropic && !useOpenAI) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);
  try {
    if (useAnthropic) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal: controller.signal,
        headers: { "x-api-key": anthropicKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({
          model: process.env.BLOG_AI_MODEL || "claude-haiku-4-5-20251001",
          max_tokens: 1800,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!res.ok) throw new Error(`Anthropic HTTP ${res.status}`);
      const data = await res.json();
      return (data.content || []).map((b) => b.text || "").join("");
    }
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${openaiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: process.env.BLOG_AI_MODEL || "gpt-4o-mini",
        max_tokens: 1800,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
  } finally {
    clearTimeout(timer);
  }
}

function parseJsonLoose(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (e) {
    /* fall through */
  }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch (e) {
      /* give up */
    }
  }
  return null;
}

// Deterministic, AI-free fallback: a real digest built from live DB data.
function dataDigestDraft(ctx, angle) {
  const cats = ctx.byCategory
    .filter((c) => c._id)
    .map((c) => `<li>${escapeHtml(c._id)} — ${c.count} open ${c.count === 1 ? "role" : "roles"}</li>`)
    .join("");
  const locs = ctx.byLocation.filter((l) => l._id).map((l) => `<li>${escapeHtml(l._id)} — ${l.count}</li>`).join("");
  const recent = ctx.recent
    .slice(0, 8)
    .map((j) => `<li>${escapeHtml(j.title)} — ${escapeHtml(j.category || "general")}, ${escapeHtml(j.location?.city || j.location?.district || "India")} (${fmtPay(j)})</li>`)
    .join("");

  const content = [
    `<h2>${escapeHtml(angle)}</h2>`,
    `<p>There are currently <strong>${ctx.openCount}</strong> open jobs listed across India on our platform. Here's a quick snapshot of what's hiring right now.</p>`,
    cats ? `<h2>Top hiring categories</h2><ul>${cats}</ul>` : "",
    locs ? `<h2>Where the jobs are</h2><ul>${locs}</ul>` : "",
    recent ? `<h2>Recently posted</h2><ul>${recent}</ul>` : "",
    `<p>Browse all current openings and apply on our jobs page.</p>`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    title: angle,
    excerpt: `${ctx.openCount} open jobs across India — the top categories and locations hiring now.`,
    content,
    tags: ["jobs", "india", "hiring"],
    category: "Careers",
  };
}

async function generateDraft() {
  const ctx = await gatherContext();
  const angle = ANGLES[new Date().getDay() % ANGLES.length];

  try {
    const raw = await callLLM(buildPrompt(ctx, angle));
    if (raw) {
      const parsed = parseJsonLoose(raw);
      if (parsed && parsed.contentHtml) {
        return {
          title: parsed.title || angle,
          excerpt: parsed.excerpt || "",
          content: parsed.contentHtml,
          tags: Array.isArray(parsed.tags) && parsed.tags.length ? parsed.tags : ["jobs", "india"],
          category: "Careers",
        };
      }
      // Model didn't return JSON — treat its output as the HTML body.
      return { title: angle, excerpt: "", content: raw, tags: ["jobs", "india"], category: "Careers" };
    }
  } catch (e) {
    console.warn("[blog-automation] AI generation failed, using data digest:", e.message);
  }

  // No AI key configured (or the call failed) → real data-driven digest.
  return dataDigestDraft(ctx, angle);
}

export async function runBlogAutomationOnce() {
  const draft = await generateDraft();
  const admin = await User.findOne({ role: "admin" }).select("_id name").lean();
  const status = process.env.BLOG_AUTOMATION_STATUS === "published" ? "published" : "draft";

  const post = await Blog.create({
    title: draft.title,
    slug: await uniqueSlug(draft.title),
    excerpt: draft.excerpt,
    content: draft.content,
    tags: draft.tags,
    category: draft.category,
    status,
    publishedAt: status === "published" ? new Date() : undefined,
    authorId: admin?._id,
    authorName: admin?.name || "Automation",
  });

  console.log(`[blog-automation] created ${status} post "${post.title}"`);
  return post;
}

export function startBlogAutomation() {
  if (process.env.BLOG_AUTOMATION_ENABLED !== "true") return;

  const expr = process.env.BLOG_AUTOMATION_CRON || "0 9 * * *";
  if (!cron.validate(expr)) {
    console.warn(`[blog-automation] invalid cron expression "${expr}" — not scheduled`);
    return;
  }

  cron.schedule(expr, () => {
    runBlogAutomationOnce().catch((e) => console.error("[blog-automation]", e.message));
  });
  console.log(`[blog-automation] scheduled (${expr}, status=${process.env.BLOG_AUTOMATION_STATUS || "draft"})`);
}
