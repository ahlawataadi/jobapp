# Feature Tracker — Haryana Job Marketplace

Legend: ✅ Done · 🔧 Partial / stub · ⬜ Not started

---

## Auth & Users

| Feature | Status | Notes |
|---|---|---|
| Email/password signup & login | ✅ | JWT + refresh-token cookie |
| OTP verification (email + SMS) | ✅ | Toggleable from admin |
| Forgot / reset password | ✅ | Token-based |
| Avatar upload | ✅ | |
| Admin: suspend / reactivate users | ✅ | |
| Admin: create users | ✅ | |
| Admin: import users (CSV) | ✅ | |
| Admin: export users (CSV) | ✅ | |

---

## Job Listings

| Feature | Status | Notes |
|---|---|---|
| Full-time / part-time / contract / internship | ✅ | |
| Hourly jobs with hourly rate | ✅ | `jobType=hourly` + `payUnit=hour` |
| Daily-wage jobs | ✅ | `jobType=daily-wage` + `payUnit=day` |
| On-demand jobs | ✅ | `jobType=on-demand` |
| Freelance / project jobs | ✅ | `jobType=freelance` + `payUnit=fixed` |
| Pay formatting (₹/hr, ₹/day, ₹/mo) | ✅ | Shared `formatPay()` utility |
| Search & filter (category, district, type, salary) | ✅ | |
| Text search with autocomplete | ✅ | |
| Location autocomplete (Google Maps) | ✅ | |
| Job detail page with apply form | ✅ | |
| Job comparison | ✅ | Side-by-side compare page |
| Vendor: post jobs | ✅ | |
| Vendor: bulk import jobs (CSV) | ✅ | |
| Admin: post jobs for any vendor | ✅ | `/admin/jobs` |
| Admin: bulk import jobs (CSV) | ✅ | `/admin/import` |
| Admin: export jobs (CSV) | ✅ | `/admin/import` → Export panel |
| Job close / delete | ✅ | Vendors can delete; admin via status |

---

## Worker (Seeker) Profiles

| Feature | Status | Notes |
|---|---|---|
| Skill category (Household, Home Repair, Automotive, Construction, Healthcare) | ✅ | `workerProfile.skillCategory` |
| Skill tags (Maid, Electrician, Mechanic, Nurse, etc.) | ✅ | `workerProfile.skills[]` |
| Bio / about | ✅ | |
| Hourly rate + daily rate | ✅ | `workerProfile.hourlyRate/dailyRate` |
| Pay preference (hourly/daily/monthly/fixed) | ✅ | |
| Location (district + city + geo) | ✅ | GeoJSON Point for radius search |
| Availability calendar (next 30 days) | ✅ | Date picker in `/worker-profile` |
| Languages (Hindi, English, etc.) | ✅ | |
| Experience field | ✅ | |
| Voice profile URL | 🔧 | Field stored; upload UI not yet built |
| Verification badge | ✅ | Admin can grant; shown on cards |
| Featured worker | ✅ | Admin can set + expiry date |
| Worker profile setup page | ✅ | `/worker-profile` (seekers only) |

---

## Worker Discovery (Employer Side)

| Feature | Status | Notes |
|---|---|---|
| Browse workers page | ✅ | `/workers` |
| Filter by category, skill, district | ✅ | |
| Verified-only filter | ✅ | |
| Geo radius search (lat/lng/radius) | ✅ | Uses MongoDB `$near` |
| Worker card with skills, badge, rate | ✅ | |
| Worker public profile page | ✅ | `/workers/:id` |
| Contact unlock (pay-per-contact) | ✅ | 1 credit per worker |
| Contact pack purchase | ✅ | ₹49/10, ₹199/25, ₹499/40 contacts |
| Admin: verify workers | ✅ | `PATCH /api/workers/:id/verify` |

---

## Secure Chat / Messaging

| Feature | Status | Notes |
|---|---|---|
| In-app 1:1 messaging | ✅ | Polling-based (5 s) |
| Conversation list | ✅ | |
| Unread badge in navbar | ✅ | 30 s polling |
| Contact-info filter (phone, email, links) | ✅ | Strips numbers, emails, WA/TG links |
| Mark messages as read | ✅ | |

---

## Monetization

| Feature | Status | Notes |
|---|---|---|
| Vendor signup fee (Razorpay) | ✅ | Configurable from admin |
| Contact packs (10/25/40 contacts) | ✅ | ₹49 / ₹199 / ₹499 |
| Contact credits on vendor account | ✅ | `User.contactCredits` |
| Subscription plans (Basic/Pro/Enterprise) | 🔧 | Field on User model; payment flow not wired |
| Featured worker fee | 🔧 | Admin can set manually; payment flow not wired |
| Verification fee | ⬜ | Not built |

---

## WhatsApp Integration

| Feature | Status | Notes |
|---|---|---|
| Incoming webhook (Twilio) | 🔧 | Stub at `POST /api/whatsapp/webhook` |
| Auto-reply "JOBS" → latest listings | 🔧 | Implemented, needs Twilio credentials |
| Broadcast new job to nearby workers | 🔧 | `broadcastJobToWorkers()` — needs Twilio |
| Worker receives hire confirmation | ⬜ | Not built |

---

## Vendors

| Feature | Status | Notes |
|---|---|---|
| Vendor onboarding | ✅ | |
| Vendor dashboard (post/manage jobs) | ✅ | |
| Vendor logo upload | ✅ | |
| Vendor document upload | ✅ | |
| Vendor public profile | ✅ | `/vendors/:id` |
| Vendor ratings / reviews | ✅ | Workers/seekers can review vendors |
| Razorpay payment flow | ✅ | Webhook + manual override |
| Admin: manage vendors | ✅ | Status, create, import, export |

---

## Admin Panel

| Feature | Status | Notes |
|---|---|---|
| Dashboard (users, vendors, config) | ✅ | `/admin` |
| Analytics | ✅ | `/admin/analytics` |
| Jobs management (create + view recent) | ✅ | `/admin/jobs` |
| Blog management (CRUD + AI generate) | ✅ | `/admin/blog` |
| Payments management | ✅ | `/admin/payments` |
| Banners management | ✅ | `/admin/banners` |
| Webhooks management | ✅ | `/admin/webhooks` |
| Import/Export (users, vendors, jobs) | ✅ | `/admin/import` |
| Email broadcast | ✅ | `/admin/broadcasts/email` |
| SMS broadcast | ✅ | `/admin/broadcasts/sms` |
| Settings (SMTP, SMS, payment gateway) | ✅ | `/admin/settings` |
| About Us & Contact Us editable | ✅ | Via admin config |
| Site title / meta / analytics script | ✅ | |
| Logo upload | ✅ | |
| OTP toggles | ✅ | |
| Google Maps API key | ✅ | |
| Worker verification & featured | ✅ | Via API; admin UI not yet dedicated |
| ETL status | ✅ | |
| Activity logs | ✅ | |

---

## Blog

| Feature | Status | Notes |
|---|---|---|
| Public blog list (`/blog`) | ✅ | Paginated, 9 per page |
| Public blog post (`/blog/:slug`) | ✅ | HTML content, tags, author |
| Admin: create / edit / delete posts | ✅ | `/admin/blog` |
| Draft vs published status | ✅ | |
| SEO meta fields | ✅ | metaTitle, metaDescription |
| AI-generated posts (Claude / OpenAI) | ✅ | Via API key env vars |
| Scheduled automation (cron) | ✅ | `BLOG_AUTOMATION_ENABLED=true` |
| External script (`scripts/auto-blog.mjs`) | ✅ | Standalone Node script |
| Tag filtering on public list | ⬜ | Query param supported server-side |

---

## Language Support

| Feature | Status | Notes |
|---|---|---|
| English UI | ✅ | Default |
| Hindi UI | ⬜ | Not built; field stored on worker profile |
| Bengali / Tamil / Telugu / Marathi | ⬜ | Planned |

---

## Infrastructure

| Feature | Status | Notes |
|---|---|---|
| Express + MongoDB (Mongoose) | ✅ | |
| JWT auth + refresh tokens | ✅ | |
| Rate limiting | ✅ | Auth routes |
| CORS, Helmet, Morgan | ✅ | |
| File uploads (Multer) | ✅ | CSV, logo, avatar, broadcast image |
| Redis (optional caching) | 🔧 | Dependency installed; not actively used |
| node-cron scheduled jobs | ✅ | Blog automation |
| Webhook dispatch system | ✅ | Outbound webhooks on key events |
| ETL pipeline | ✅ | `npm run etl` |
