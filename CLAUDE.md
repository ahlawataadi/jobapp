# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A MERN job marketplace (originally Haryana-focused, now India-wide): job
seekers browse/apply and can be discovered/hired directly, vendors post jobs,
and an admin panel manages users, vendors, jobs, payments, banners,
broadcasts, blog, and most runtime configuration (branding, SMTP/SMS,
Razorpay keys, OTP toggles, R2 storage, pricing) via a singleton `AdminConfig`
document rather than env vars/redeploys.

Full architecture (data flow diagrams, auth sequence, domain flows like
contact-unlock and subscriptions, ER diagram) lives in
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — read it before making
non-trivial backend changes. Feature inventory with status (done/partial/not
started) is in [FEATURES.md](FEATURES.md) / [docs/FEATURES.md](docs/FEATURES.md).
Manual test plan (no automated suite exists yet) is in
[docs/TEST_CASES.md](docs/TEST_CASES.md).

## Commands

```bash
# Backend (server/)
npm install
npm run dev          # nodemon, http://localhost:5000
npm run seed          # bootstrap admin + demo vendors/jobs (Haryana-flavored)
npm run etl           # run the ETL pipeline (server/src/scripts/etl.js)

# Frontend (client/)
npm install
npm run dev           # Vite, http://localhost:3000, proxies /api and /uploads → :5000
npm run build
npm run preview
```

There is **no test runner configured** (no Jest/Vitest/Mocha in either
package.json) and **no lint script**. CI (`.github/workflows/ci.yml`) only
does `node --check` syntax validation on every server file and a client
`npm run build`. Don't assume `npm test` exists.

### Running without a local MongoDB install

`mongodb-memory-server` is a server devDependency but has no npm script. Spin
up an ephemeral Mongo on the default port before seeding/running:

```bash
node server/src/scripts/memdb.js   # ephemeral Mongo on :27017, dbName "jobapp" — keep running in its own terminal
cd server && npm run seed && npm run dev
```

Seed credentials: admin `admin@jobapp.local` / `ChangeMe123!`, demo vendors
`*.@vendor.jobapp.local` / `VendorPass123!`, seekers `*.seeker@jobapp.local` /
`SeekerPass123!`.

## Architecture essentials

- **Backend**: Express (ESM, `"type": "module"`), Mongoose, JWT auth. Entry
  is `server/src/server.js` (connects DB, starts the blog cron, listens, and
  handles SIGTERM/SIGINT graceful shutdown) → `server/src/app.js` (middleware
  + route wiring, no DB/listen logic — keep that separation when touching
  either file).
- **Auth**: short-lived JWT access token (client keeps it in Redux memory
  only, never persisted) + httpOnly refresh-token cookie. `refreshTokenVersion`
  on `User` lets the server revoke all sessions (logout, password change).
  `requireAuth` (`server/src/middleware/auth.js`) loads `req.user` *without*
  `passwordHash`; handlers that need the hash re-fetch the full doc. Roles are
  `seeker` / `vendor` / `admin`, gated with `requireRole(...)`; `requireVendor`
  additionally loads `req.vendor` from the logged-in user.
- **Client data fetching is split across two patterns** — don't assume RTK
  Query is used everywhere just because it's in the stack:
  - `client/src/api/axios.js` — a configured axios instance with a
    request interceptor that attaches the Redux access token, and a response
    interceptor that on 401 calls `/auth/refresh`, queues concurrent requests
    while refreshing, and retries them. This is what most pages/components use.
  - `client/src/store/jobsApi.js` — the only RTK Query (`createApi`) slice,
    used solely for job listings.
- **AdminConfig is the runtime config singleton** (`_id: "config"`,
  `server/src/models/AdminConfig.js`, fetched via `getConfig()`). It holds
  branding, OTP enable/disable per channel, SMTP, SMS provider, Razorpay keys,
  R2 storage settings, contact-pack/subscription pricing, About/Contact/Terms
  content. DB values take precedence over equivalent env vars (e.g. R2). When
  adding an admin-configurable setting, it likely belongs here, not in `.env`.
- **File storage abstraction** (`server/src/utils/storage.js`): uploads go
  through `persistUpload(file, subdir)`, which writes to Cloudflare R2 (native
  SigV4 over `fetch`, no AWS SDK) if `AdminConfig.r2Storage.enabled`, else to
  local `/uploads`. Don't write directly to disk in new upload handlers.
- **Payments (Razorpay)**: three independent purchase flows share the same
  create-order → client checkout → verify-signature → credit-the-account
  pattern: vendor signup fee, contact-pack purchase (credits to unlock a
  worker's phone/email), and subscriptions. Credits/plan activation only ever
  happen *after* HMAC signature verification server-side — never optimistically
  on the client. The Razorpay webhook route is mounted before the global
  `express.json()` parser in `app.js` and uses `express.raw()` so the raw body
  is available for HMAC verification — keep that ordering if you touch
  `app.js`.
- **Background jobs**: `node-cron` blog automation
  (`server/src/jobs/blogScheduler.js`, gated by `BLOG_AUTOMATION_ENABLED`) is
  the only scheduled job; it's also reachable on-demand via
  `POST /api/admin/blog/generate` and via the standalone
  `scripts/auto-blog.mjs` (logs in over the API — for system cron / CI). All
  three call the same `runBlogAutomationOnce()` so behavior stays consistent
  regardless of trigger. See the README's "Blog automation" section for the
  data flow and AI-provider fallback (Claude/OpenAI via plain `fetch`, no SDK
  — falls back to a deterministic DB-digest post if no AI key is set). Posts
  always save as `draft` by default for human review.
- **Webhooks**: outbound webhook dispatch on domain events (job created,
  application created, blog published, etc.) is a separate system from the
  inbound Razorpay webhook — don't conflate them when searching for "webhook".
- **Geo features**: `Job` and `User.workerProfile` both carry a GeoJSON Point
  + 2dsphere index for radius search (`$near`); `Job`/text fields also carry a
  text index for search.

## Conventions worth knowing before editing

- Server code is ES modules throughout (`import`/`export`, no `require`).
- One router per domain in `server/src/routes/`, thin — handlers live in
  `server/src/controllers/`.
- Job pay is described by `jobType` (`full-time` / `part-time` / `contract` /
  `internship` / `hourly` / `daily-wage` / `on-demand` / `freelance`) paired
  with `payUnit` (`month` / `hour` / `day` / `fixed`); pay display goes
  through a shared `formatPay()` utility — use it rather than formatting pay
  inline.
- CSV import/export (users, vendors, jobs) is a first-class admin feature with
  per-entity templates; vendors can also self-import their own jobs. If
  extending an entity with a new field, check whether the corresponding
  import/export CSV column mapping needs updating too.
- Admin-authored HTML (blog posts, About/Contact/Terms content) is rendered
  through DOMPurify on the client — never render it raw.
