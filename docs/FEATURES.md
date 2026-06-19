# Haryana Job Marketplace — Feature Inventory

> Author: Product / Architecture
> A complete catalogue of what the application does today, grouped by actor.
> Legend: ✅ implemented · ⚠️ partial / cosmetic · 🚧 planned (see roadmap)

## 1. Actors

| Actor | Description |
|-------|-------------|
| Visitor | Unauthenticated user browsing public pages |
| Job Seeker (`seeker`) | Registers, builds a worker profile, applies to jobs |
| Employer / Vendor (`vendor`) | Posts jobs, reviews applicants, unlocks worker contacts |
| Admin (`admin`) | Configures the platform, moderates, views analytics |

## 2. Authentication & accounts

| Feature | Status | Notes |
|---------|--------|-------|
| Email/password registration | ✅ | Role chosen at signup (seeker/vendor) |
| OTP verification (email or SMS) | ✅ | Required for phone signups; channel selectable |
| Login with access + refresh tokens | ✅ | In-memory access token, httpOnly refresh cookie |
| Silent session restore | ✅ | `/auth/refresh` on app load |
| Logout (server-side revocation) | ✅ | `refreshTokenVersion` bump |
| Forgot / reset password | ✅ | Token-based reset via email |
| Change password | ✅ | Re-issues tokens, revokes old sessions |
| Profile management (name, phone, avatar) | ✅ | Avatar upload via storage layer |
| Role-based route protection | ✅ | Server (`requireRole`) + client (`ProtectedRoute`) |

## 3. Visitor / public

| Feature | Status | Notes |
|---------|--------|-------|
| Home with hero search, district map, featured employers | ✅ | |
| "Recently posted" jobs (3-up cards) | ✅ | |
| Job search with filters (keyword, district, type, salary, geo radius) | ✅ | Text + 2dsphere indexes |
| Job search autocomplete suggestions | ✅ | |
| Worker directory with filters (category, skill, district, verified) | ✅ | Lists all active seekers |
| Blog list + post (SEO content) | ✅ | HTML sanitized on render |
| Static/admin-editable pages: About, Contact, Terms, Privacy | ✅ | Rich text + featured image |
| Pricing page (seeker & vendor plans) | ✅ | Driven by AdminConfig |
| Login wall on job & vendor detail | ✅ | Redirects to login, returns after |
| Accessibility (skip link, ARIA, keyboard nav) | ✅ | WCAG-oriented pass |

## 4. Job Seeker

| Feature | Status | Notes |
|---------|--------|-------|
| Build worker profile (skills, category, rates, availability, languages, bio) | ✅ | |
| Appear in worker directory | ✅ | |
| Apply to jobs (cover note) | ✅ | Duplicate-apply prevented |
| Track my applications & statuses | ✅ | applied / shortlisted / rejected |
| Email on application status change | ✅ | |
| Intro video upload (premium) | ✅ | Server-enforced active subscription (402 otherwise) |
| Subscribe to a seeker plan | ✅ | Razorpay; free plan activates instantly |
| Resume upload (PDF/DOC/DOCX) | ✅ | Uploaded on profile; auto-attached on apply |
| Saved / bookmarked jobs | ✅ | Save toggle on job detail; Saved Jobs page |

## 5. Employer / Vendor

| Feature | Status | Notes |
|---------|--------|-------|
| Vendor onboarding (org profile, logo, documents) | ✅ | |
| Optional signup fee (Razorpay) | ✅ | Toggle + amount in admin |
| Post / edit / close jobs | ✅ | |
| View applicants & change status | ✅ | Ownership enforced |
| Email when a candidate applies | ✅ | Best-effort notification to vendor |
| Unlock worker contact (spend credit) | ✅ | One credit per unlock |
| Buy contact-credit packs | ✅ | Paid Razorpay flow; credits granted only after verify |
| Featured vendor placement (fee) | ⚠️ | Fee configurable; manual grant by admin |
| Subscribe to a vendor plan | ✅ | Razorpay |
| Intro video (premium) | ✅ | Subscription-gated server-side |
| Chat with applicants/seekers | ✅ | HTTP polling (not real-time) |

## 6. Admin

| Feature | Status | Notes |
|---------|--------|-------|
| Dashboard / panel | ✅ | |
| User management (list, suspend, set subscription) | ✅ | |
| Vendor management (status, featured) | ✅ | |
| Job management | ✅ | |
| Analytics (charts) | ✅ | Recharts |
| Payments list, refund, update | ✅ | |
| Fees & pricing (signup fee, contact packs, plans, featured fees) | ✅ | |
| Blog management + AI automation (cron) | ✅ | Generate / import / seed |
| Banners (promotional) | ✅ | |
| Pages editor (About/Contact/Terms/Privacy) with images | ✅ | Rich text editor with image upload |
| Broadcast email / SMS to audiences | ✅ | |
| Webhooks (outbound integrations) | ✅ | Create/test/delete |
| Settings: branding/SEO, OTP, Google Maps, SMTP, SMS, payment gateway, **R2 storage** | ✅ | Runtime config in DB |
| Import users/vendors/jobs (CSV) | ✅ | |
| Activity logs | ✅ | |

## 7. Platform / system features

| Feature | Status | Notes |
|---------|--------|-------|
| File storage: local disk or Cloudflare R2 (runtime-switchable) | ✅ | Admin panel or env; see R2_SETUP.md |
| Payments: Razorpay orders + HMAC verify + webhook | ✅ | Webhook is source of truth |
| Email (SMTP) & SMS (Twilio / HTTP gateway) | ✅ | Configurable |
| Reviews & ratings for vendors | ✅ | |
| District-level geo search | ✅ | |
| Rate limiting (auth + general API) | ✅ | |
| HTML sanitization (DOMPurify) | ✅ | |
| Health probe with DB check | ✅ | |
| Graceful shutdown | ✅ | |
| Client code-splitting (lazy routes) | ✅ | ~4× smaller initial bundle |
| In-app notifications | 🚧 | Only email + chat-unread polling today |
| Real-time chat (websockets) | 🚧 | Currently 30s polling |
| Automated tests + OpenAPI docs | 🚧 | See TEST_CASES.md |

## 8. Monetization summary

| Stream | Mechanism | Status |
|--------|-----------|--------|
| Vendor signup fee | One-time Razorpay payment, admin-toggleable | ✅ |
| Contact-credit packs | Paid Razorpay flow (no free credits) | ✅ |
| Subscriptions (seeker & vendor plans) | Monthly Razorpay; premium features gated server-side | ✅ |
| Featured worker / vendor placement | Weekly fee configurable; admin-granted | ⚠️ |

## 9. Roadmap (prioritized)

1. ~~Resume upload for seekers~~ ✅ shipped (Group A).
2. ~~Saved/bookmarked jobs~~ ✅ shipped (Group A).
3. **In-app notifications** (model + center) and vendor alerts beyond email — Group B.
4. **Real-time chat** via websockets (replace polling) — Group B.
5. **Automated test suite** + request validation + OpenAPI — Group C.
6. **Image compression** on upload; **config caching** — Group D.
7. **Secrets encryption at rest**; sandbox admin analytics script — Group D.
8. **Self-serve featured placement** checkout (close the ⚠️ gap).
