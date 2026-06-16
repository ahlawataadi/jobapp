#!/usr/bin/env node
/**
 * Auto-publish a blog post to the jobapp via the admin API.
 *
 * This is a standalone Node 18+ script (uses global fetch). Run it on any
 * scheduler — Linux cron, Windows Task Scheduler, or a GitHub Actions cron —
 * and it will log in as an admin and create a post.
 *
 *   ADMIN_EMAIL=admin@site.com ADMIN_PASSWORD=secret \
 *   API_URL=https://your-domain.com/api node scripts/auto-blog.mjs
 *
 * Tip: set status: "draft" (below) if you'd rather review before it goes live.
 */

const API_URL = process.env.API_URL || "http://localhost:5000/api";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

async function main() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD environment variables.");
  }

  // 1) Authenticate as admin.
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.status}`);
  const { accessToken } = await loginRes.json();

  // 2) Build the post. Swap generateContent() for an LLM call for true automation.
  const post = await generateContent();

  // 3) Create it. status "published" goes live now; "draft" waits for review.
  const res = await fetch(`${API_URL}/admin/blog`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(post),
  });
  if (!res.ok) throw new Error(`Create failed: ${res.status} ${await res.text()}`);

  const { post: created } = await res.json();
  console.log(`Published: "${created.title}"  ->  /blog/${created.slug}`);
}

/**
 * Returns the post body. Replace the canned content with a real AI call.
 *
 * Example with the Anthropic SDK (npm i @anthropic-ai/sdk):
 *
 *   import Anthropic from "@anthropic-ai/sdk";
 *   const client = new Anthropic();             // reads ANTHROPIC_API_KEY
 *   const topic = "Top in-demand jobs in Haryana this week";
 *   const msg = await client.messages.create({
 *     model: "claude-haiku-4-5-20251001",
 *     max_tokens: 1500,
 *     messages: [{ role: "user", content:
 *       `Write a 600-word blog post in HTML (<h2>/<p>/<ul>) titled "${topic}". ` +
 *       `Return only the HTML body.` }],
 *   });
 *   const content = msg.content.map((b) => b.text || "").join("");
 *   return { title: topic, content, tags: ["jobs","haryana"], category: "Careers", status: "draft" };
 */
async function generateContent() {
  const topics = [
    "Top 5 in-demand jobs across India this month",
    "How to write a daily-wage job listing that attracts applicants",
    "Hourly vs. monthly roles: what every job seeker should know",
    "A vendor's guide to hiring on-demand and freelance workers",
  ];
  const title = topics[new Date().getDate() % topics.length];
  return {
    title,
    excerpt: `${title} — a quick, practical guide.`,
    content: `<h2>${title}</h2><p>Replace this with AI-generated or hand-written HTML content.</p>`,
    tags: ["jobs", "haryana"],
    category: "Careers",
    status: "published",
  };
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
