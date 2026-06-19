# Haryana Job Marketplace — Test Plan & Test Cases

> Author: QA / Test Engineering
> Covers functional, negative, edge, security, and non-functional cases for every
> major use case. Each case: **ID · Title · Preconditions · Steps · Expected**.
> Priority: P1 (critical/blocker), P2 (major), P3 (minor).

## How to run (local)

1. Start MongoDB (or `node server/src/scripts/memdb.js` for an ephemeral DB).
2. `cd server && npm run seed && npm run dev`
3. `cd client && npm run dev` → open `http://localhost:3000`.
4. Seed logins: admin `admin@jobapp.local / ChangeMe123!`; vendors
   `*.@vendor.jobapp.local / VendorPass123!`; seekers `*.seeker@jobapp.local / SeekerPass123!`.

Suggested automation: API/integration via Jest/Vitest + Supertest against
`mongodb-memory-server`; E2E via Playwright. (Not yet implemented — this is the spec.)

---

## 1. Authentication

| ID | Title | Preconditions | Steps | Expected | Pri |
|----|-------|---------------|-------|----------|-----|
| AUTH-01 | Register as seeker | No account | Register with name/email/password, role=seeker | OTP screen or account created; user role=seeker | P1 |
| AUTH-02 | Register duplicate email | Email exists | Register with same email | 409 / "email already in use" | P2 |
| AUTH-03 | Weak password rejected | — | Register with password < 6 chars | Validation error, no account | P2 |
| AUTH-04 | OTP verification (phone) | Registered with phone | Submit correct OTP | Account verified, can log in | P1 |
| AUTH-05 | OTP wrong/expired | Pending verification | Submit wrong/expired OTP | Error; not verified | P2 |
| AUTH-06 | Login success | Verified account | Login with valid creds | Access token issued, refresh cookie set | P1 |
| AUTH-07 | Login wrong password | Account exists | Login with bad password | 401, generic error | P1 |
| AUTH-08 | Silent refresh | Logged in, token expired | Trigger 401 request | New access token via refresh cookie; request retried | P1 |
| AUTH-09 | Logout revokes refresh | Logged in | Logout, then reuse old refresh cookie | Refresh rejected (version mismatch) | P1 |
| AUTH-10 | Forgot/reset password | Account exists | Request reset, use emailed token, set new password | Login works with new password only | P1 |
| AUTH-11 | Change password revokes sessions | Logged in | Change password | Old refresh invalidated; new tokens issued | P2 |
| AUTH-12 | Password hash never leaks | Logged in | Inspect any `user` payload / `req.user` | No `passwordHash` field present | P1 |

## 2. Authorization & route protection

| ID | Title | Preconditions | Steps | Expected | Pri |
|----|-------|---------------|-------|----------|-----|
| AUTHZ-01 | Seeker blocked from vendor route | Logged in seeker | Call `POST /api/jobs` (vendor-only) | 403 Forbidden | P1 |
| AUTHZ-02 | Non-admin blocked from admin API | Logged in seeker/vendor | Call any `/api/admin/*` | 403 | P1 |
| AUTHZ-03 | Job detail requires login | Logged out | Open `/jobs/:id` | Redirect to `/login`, return after login | P2 |
| AUTHZ-04 | Vendor detail requires login | Logged out | Open `/vendors/:id` | Redirect to `/login` | P2 |
| AUTHZ-05 | Missing/invalid token | — | Call protected API with no/garbage token | 401 | P1 |

## 3. Job seeker — profile & applications

| ID | Title | Preconditions | Steps | Expected | Pri |
|----|-------|---------------|-------|----------|-----|
| SEEK-01 | Create worker profile | Logged in seeker | Fill skills/category/rates/availability, save | Profile saved; appears in worker directory | P1 |
| SEEK-02 | Apply to job | Open job exists | Apply with cover note | 201; application listed under "My Applications" | P1 |
| SEEK-03 | Duplicate application blocked | Already applied | Apply again | 409 "already applied" | P1 |
| SEEK-04 | Apply to closed job | Job status=closed | Apply | 400 "Job is closed" | P2 |
| SEEK-05 | Status-change email | Application exists | Vendor shortlists/rejects | Seeker receives email | P2 |
| SEEK-06 | Intro video without subscription | Seeker, plan=none | `POST /workers/me/video` | **402** "active subscription required" | P1 |
| SEEK-07 | Intro video with subscription | Seeker, active plan | Upload video | 200, video URL stored | P2 |
| SEEK-08 | Worker appears even without skill category | New seeker, no skillCategory | Open `/workers` | Seeker is listed (all active seekers shown) | P2 |

## 4. Employer / vendor

| ID | Title | Preconditions | Steps | Expected | Pri |
|----|-------|---------------|-------|----------|-----|
| VEND-01 | Onboarding | Logged in vendor | Complete org profile, upload logo/docs | Vendor profile created | P1 |
| VEND-02 | Signup fee (when required) | `paymentRequired=true` | Create order, pay, verify | Vendor `paymentStatus=paid`, status active | P1 |
| VEND-03 | Post a job | Active vendor | Create job | Job visible in search | P1 |
| VEND-04 | Edit/close own job | Owns job | Edit/close | Changes saved; closed job not applyable | P2 |
| VEND-05 | Cannot edit another vendor's job | Owns nothing | Edit other's job | 403 "Not your job posting" | P1 |
| VEND-06 | View applicants & change status | Has applicants | Shortlist/reject | Status updates; seeker emailed | P2 |
| VEND-07 | New-application email to vendor | Vendor owns open job | Seeker applies | Vendor receives "new application" email | P2 |
| VEND-08 | Unlock with credits | Vendor has ≥1 credit | Unlock worker contact | Phone/email revealed; credits −1 | P1 |
| VEND-09 | Unlock without credits | Vendor, 0 credits | Unlock | 402; prompted to buy a pack | P1 |
| VEND-10 | Re-unlock same worker | Already unlocked | Unlock again | No extra charge; details returned | P2 |

## 5. Monetization — contact packs & subscriptions (regression-critical)

| ID | Title | Preconditions | Steps | Expected | Pri |
|----|-------|---------------|-------|----------|-----|
| PAY-01 | Free contact-credit hole closed | Logged in vendor | `POST /api/workers/contact-packs/buy` | **410** deprecated; **no credits added** | P1 |
| PAY-02 | Contact pack create-order (vendor) | Vendor, gateway configured | `POST /payments/contact-pack/create-order {pack}` | 200 order with `orderId`,`keyId`,`amount` | P1 |
| PAY-03 | Contact pack create-order (non-vendor) | Admin/seeker | Same call | 403 "Only vendors…" | P2 |
| PAY-04 | Contact pack invalid pack | Vendor | create-order with bad pack key | 400 "Invalid pack" | P2 |
| PAY-05 | Contact pack verify good signature | Order created | verify with valid HMAC | Credits added exactly once; payment=paid | P1 |
| PAY-06 | Contact pack verify bad signature | Order created | verify with tampered signature | 400 "Invalid payment signature"; no credits | P1 |
| PAY-07 | Contact pack verify idempotent | Already paid | verify same order again | "Already processed"; credits not double-added | P1 |
| PAY-08 | Subscribe paid plan | Seeker/vendor | subscribe create-order → pay → verify | `subscription.plan` set, `expiresAt` +30d | P1 |
| PAY-09 | Subscribe free plan (price 0) | Plan priced 0 | subscribe create-order | Activated immediately, no Razorpay | P2 |
| PAY-10 | Vendor signup payment signature | Order created | verify with bad signature | 400; vendor not activated | P1 |
| PAY-11 | Webhook fulfils order | Razorpay webhook configured | `payment.captured` for each type | vendor active / subscription set / credits added (idempotent) | P1 |
| PAY-12 | Webhook bad signature | — | POST webhook with wrong signature | 400; nothing changes | P1 |

## 6. Admin

| ID | Title | Preconditions | Steps | Expected | Pri |
|----|-------|---------------|-------|----------|-----|
| ADM-01 | Edit fees & plans | Admin | Update contact packs, seeker/vendor plans, featured fees | Persisted; reflected on Pricing | P1 |
| ADM-02 | Set user subscription | Admin | Set a user's plan + expiry | User gains plan; premium features unlocked | P2 |
| ADM-03 | Suspend user | Admin | Suspend a user | User `status=suspended`; excluded from worker directory | P2 |
| ADM-04 | Pages editor + image | Admin | Edit About, upload featured + inline image, save | Public page shows sanitized content + images | P1 |
| ADM-05 | Generate blog (unique) | Admin | Click "Generate post" repeatedly | Each creates a unique slug (no overwrite) | P2 |
| ADM-06 | Broadcast email/SMS | Admin | Send to an audience | Recipients receive; image URL absolute when on S3 | P2 |
| ADM-07 | CSV import | Admin | Import users/vendors/jobs CSV | Rows created; errors reported per row | P2 |
| ADM-08 | Admin sees no subscription card | Admin on profile | Open profile | Subscription card hidden for admin | P3 |
| ADM-09 | Integration settings save | Admin | Save SMTP/SMS/payment/S3 | Persisted; secrets never returned to public config | P1 |

## 7. File storage (local ↔ S3)

| ID | Title | Preconditions | Steps | Expected | Pri |
|----|-------|---------------|-------|----------|-----|
| STOR-01 | Local upload + serve | S3 disabled | Upload image | URL `/uploads/...`; fetch returns 200 image | P1 |
| STOR-02 | S3 routing | S3 enabled (admin panel) w/ valid keys | Upload image | Absolute S3/CDN URL; object in bucket | P1 |
| STOR-03 | S3 enabled, bad keys | S3 enabled, fake keys | Upload | Error (no silent local fallback success); no fake URL stored | P2 |
| STOR-04 | Config precedence | DB + env both set | Upload | DB S3 settings used over env | P3 |
| STOR-05 | Editor image persists | Admin Pages editor | Insert inline image, save, reload | Image still shows (URL-based, not lost base64) | P1 |
| STOR-06 | Non-image rejected | — | Upload .exe/.txt to image endpoint | Rejected by file filter | P2 |
| STOR-07 | Oversized file rejected | — | Upload > size limit | 4xx, not stored | P2 |

## 8. Search & discovery

| ID | Title | Steps | Expected | Pri |
|----|-------|-------|----------|-----|
| SRCH-01 | Keyword job search | Search "developer" | Relevant jobs via text index | P2 |
| SRCH-02 | Filter by district | Filter Gurugram | Only matching district jobs | P2 |
| SRCH-03 | Geo radius search | Provide lat/lng + radius | Jobs within radius (2dsphere) | P2 |
| SRCH-04 | Worker category filter | Filter automotive | Only that category; incomplete profiles excluded when filtered | P2 |
| SRCH-05 | Pagination | Page through results | `page/pages/total` correct; bounds respected | P3 |
| SRCH-06 | Autocomplete | Type ≥2 chars | Suggestion list (listbox a11y roles) | P3 |

## 9. Security & non-functional

| ID | Title | Steps | Expected | Pri |
|----|-------|-------|----------|-----|
| SEC-01 | Public config hides secrets | GET `/api/admin/config` (public) | No SMTP pass / payment secret / S3 secret | P1 |
| SEC-02 | Stored XSS sanitized | Save blog/page HTML with `<script>`/`onerror` | Rendered output stripped of script/handlers | P1 |
| SEC-03 | Auth rate limit | >50 login attempts /15min | 429 Too Many Requests | P2 |
| SEC-04 | General API rate limit | Exceed 600 req/15min | 429 | P3 |
| SEC-05 | CORS | Cross-origin request from disallowed origin | Blocked | P2 |
| SEC-06 | 5xx hides internals (prod) | Force server error with NODE_ENV=production | Generic "Internal server error" (no stack/DB detail) | P2 |
| SEC-07 | Health degraded on DB down | Stop Mongo, GET `/health` | 503 `db:disconnected` | P2 |
| SEC-08 | Graceful shutdown | Send SIGTERM | In-flight requests finish; Mongo closed; exit 0 | P3 |
| SEC-09 | No personal data in URLs | Inspect requests | No PII in query strings | P3 |
| PERF-01 | Initial bundle size | Build client | Main chunk well below pre-split (~326 kB) ; admin libs lazy | P3 |
| A11Y-01 | Keyboard navigation | Tab through app | Skip link works; focus visible; menus keyboard-operable | P2 |
| A11Y-02 | Screen-reader labels | Inspect controls | Icon buttons/cards have aria-labels; toolbar roles correct | P3 |

## 10. Regression checklist (recent fixes)

- [ ] PAY-01 free-credit hole returns 410, no credits granted
- [ ] SEEK-06 premium video upload returns 402 without active plan
- [ ] VEND-07 vendor emailed on new application
- [ ] SEC-06 5xx generic message in production
- [ ] SEC-07 `/health` reflects DB state
- [ ] STOR-05 editor image persists after reload (local & S3)
- [ ] ADM-09 / SEC-01 secrets never exposed via public config
- [ ] AUTH-12 password hash absent from all responses

## 11. Test data & environments

| Env | DB | Storage | Payments |
|-----|----|---------|---------| 
| Unit/Integration | mongodb-memory-server | local temp | mocked Razorpay |
| Staging | managed Mongo | S3 (test bucket) | Razorpay test keys |
| Production | managed Mongo (backups) | S3 + CDN | Razorpay live keys |

> Note: payment cases (PAY-02/05/08…) require Razorpay test keys for the happy
> path; signature-verification cases (PAY-06/10/12) can be unit-tested with a
> known secret and crafted HMAC, no live gateway needed.
