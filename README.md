# Jobapp — Haryana Job Marketplace

A MERN job marketplace: job seekers browse/apply, vendors post jobs, and an
admin panel manages users, vendors, jobs, payments, banners, broadcasts and a
blog. Express + MongoDB (Mongoose) backend, React (Vite) + Redux Toolkit
Query frontend.

## Stack

- **Backend**: Node/Express, MongoDB (Mongoose), JWT auth, Multer (CSV/file
  uploads), node-cron (scheduled jobs).
- **Frontend**: React 18 + Vite, Redux Toolkit Query, Tailwind.

## Setup

```bash
# Backend
cd server
cp .env.example .env        # if present; otherwise set the vars below
npm install
npm run seed                # bootstrap admin + sample Haryana data
npm run dev                 # http://localhost:5000

# Frontend
cd client
npm install
npm run dev                 # http://localhost:3000 (proxies /api → :5000)
```

### Key environment variables (server)

| Var | Purpose |
|---|---|
| `PORT` | API port (default 5000) |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | Auth token signing |
| `CLIENT_URL` | CORS origin for the frontend |
| `BLOG_AUTOMATION_ENABLED` | `true` to enable the scheduled blog generator (default off) |
| `BLOG_AUTOMATION_CRON` | Cron expression, default `0 9 * * *` (09:00 daily) |
| `BLOG_AUTOMATION_STATUS` | `draft` (default, recommended) or `published` |
| `BLOG_AI_PROVIDER` | `anthropic` or `openai` (optional — auto-detected from whichever key is set) |
| `BLOG_AI_MODEL` | Model id (defaults: `claude-haiku-4-5-20251001` / `gpt-4o-mini`) |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` | Key for AI-generated posts (optional — without it, a data digest is used) |

## Features

### Job types & pay
Jobs support `jobType` = `full-time`, `part-time`, `contract`, `internship`,
**`hourly`**, **`daily-wage`**, **`on-demand`**, **`freelance`**, plus a
**`payUnit`** (`month` / `hour` / `day` / `fixed`) describing the
`salaryMin`–`salaryMax` range. The UI renders pay accordingly
(e.g. `₹200–₹350/hr`, `₹600/day`, `Negotiable` for fixed).

### Admin: add jobs, import & export
- **Admin → Jobs**: create a job for any vendor.
- **Admin → Import Data**: CSV import for Users, Vendors and **Jobs**, plus a
  **Download CSV template** on each card and an **Export** panel
  (Users / Vendors / Jobs → CSV).
- **Vendors** can bulk-import their own jobs from their dashboard.

### Blog
Admin-authored posts that appear on the public site.
- Public: `/blog` (list) and `/blog/:slug` (post).
- **Admin → Blog**: create / edit / delete, draft vs published, SEO meta.

## API reference (new/relevant endpoints)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/jobs` | — | List/filter jobs (`?jobType=hourly` etc.) |
| POST | `/api/jobs/import` | vendor | Bulk import the vendor's own jobs (CSV) |
| POST | `/api/admin/jobs` | admin | Create a job for a vendor |
| POST | `/api/admin/import/jobs` | admin | Bulk import jobs (CSV) |
| GET | `/api/admin/export/users` | admin | Export users CSV |
| GET | `/api/admin/export/vendors` | admin | Export vendors CSV |
| GET | `/api/admin/export/jobs` | admin | Export jobs CSV |
| GET | `/api/blog` | — | List published posts (paginated) |
| GET | `/api/blog/:slug` | — | Single published post |
| GET | `/api/admin/blog` | admin | List all posts (any status) |
| POST | `/api/admin/blog` | admin | Create a post |
| PATCH | `/api/admin/blog/:id` | admin | Update a post |
| DELETE | `/api/admin/blog/:id` | admin | Delete a post |
| POST | `/api/admin/blog/generate` | admin | Generate one post on demand |

### Job import CSV columns
`vendorId,title,description,category,industry,district,city,salaryMin,salaryMax,jobType,payUnit`
(For admin imports you may replace `vendorId` with `vendorOrgName` or
`vendorEmail`. Vendor self-imports omit the vendor column entirely.)

## Blog automation — how it works

There are **three ways** to create posts automatically, all of which run the
same generation step and save a post through the normal Blog model:

1. **Scheduled (in-process)** — [`server/src/jobs/blogScheduler.js`](server/src/jobs/blogScheduler.js)
   registers a `node-cron` job at boot (only if `BLOG_AUTOMATION_ENABLED=true`).
2. **One-click** — the **⚡ Generate post now** button in Admin → Blog calls
   `POST /api/admin/blog/generate`, which runs the same `runBlogAutomationOnce()`.
3. **External script** — [`scripts/auto-blog.mjs`](scripts/auto-blog.mjs) logs in
   over the API and creates a post; run it from system cron / Task Scheduler /
   GitHub Actions.

### Data flow

```
trigger (cron tick │ admin button │ external script)
        │
        ▼
  generateDraft()         ← builds { title, content (HTML), excerpt, tags, category }
        │
        ▼
  Blog.create({ …, status })   status = BLOG_AUTOMATION_STATUS (default "draft")
        │
        ▼
  Admin → Blog (review/edit)  ──publish──▶  /blog  (public)
```

### Where does the content come from?

The generator is **grounded in your live database and is India-wide** — it never
filters to a single state or district. On every run, `generateDraft()` in
[`blogScheduler.js`](server/src/jobs/blogScheduler.js) first calls
`gatherContext()`, which aggregates across **all open jobs in the country**:

- the total open-job count,
- the top hiring **categories**,
- the most active **locations** (city, falling back to district) nationwide,
- the 12 most recent listings (title, category, type, pay).

It then has two modes:

1. **With an AI key** (`ANTHROPIC_API_KEY` or `OPENAI_API_KEY`): that context is
   placed in a prompt and sent to Claude or OpenAI (via plain `fetch` — **no SDK
   dependency**). The model returns a JSON post — `title`, `excerpt`,
   `contentHtml`, `tags` — grounded in the real data above. Provider and model
   come from `BLOG_AI_PROVIDER` / `BLOG_AI_MODEL`, auto-detected from whichever
   key is present.
2. **Without a key**: it falls back to a deterministic **data digest** — a real
   post assembled from the same DB aggregates (e.g. "There are 142 open jobs
   across India… top categories… recently posted…"). No external calls, still
   useful.

Either way the post is saved as a **draft** by default for human review, which
is what keeps automation useful rather than SEO-risky auto-spam.
