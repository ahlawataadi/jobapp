# Haryana Job Marketplace — Architecture

> Author: Engineering / Architecture
> Scope: full-stack MERN job & worker marketplace (job seekers, employers/vendors, admin)

## 1. High-level overview

A single-page React client talks to an Express REST API backed by MongoDB.
Authentication is JWT (short-lived access token + httpOnly refresh cookie).
Uploaded files go to local disk or Amazon S3 via a storage abstraction.
Payments run through Razorpay. Email/SMS are pluggable (SMTP / Twilio or a
generic HTTP gateway), all configurable at runtime from the admin panel.

```mermaid
graph TD
  subgraph Client["React SPA (Vite)"]
    UI[Pages & Components]
    RTK[Redux Toolkit + RTK Query]
    UI --> RTK
  end

  subgraph Server["Express API (Node, ESM)"]
    MW[Middleware: auth, rate-limit, uploads, errors]
    RT[Routes]
    CTRL[Controllers]
    UTIL[Utils: storage, mailer, sms, tokens, webhooks]
    MW --> RT --> CTRL --> UTIL
  end

  DB[(MongoDB)]
  S3[(S3 / local /uploads)]
  RZP[Razorpay]
  MAIL[SMTP / Email]
  SMS[Twilio / SMS gateway]

  RTK -- HTTPS /api --> MW
  CTRL --> DB
  UTIL --> S3
  CTRL --> RZP
  UTIL --> MAIL
  UTIL --> SMS
```

## 2. Technology stack

| Layer | Tech |
|-------|------|
| Client | React 18, Vite, React Router v6, Redux Toolkit + RTK Query, Tailwind CSS, TipTap (rich text), Recharts (admin analytics), DOMPurify |
| Server | Node.js (ES modules), Express, Mongoose, JWT (`jsonwebtoken`), `bcryptjs`, `multer`, `express-rate-limit`, `helmet`, `morgan`, `node-cron` |
| Data | MongoDB (Mongoose ODM) |
| Storage | Local disk (`/uploads`) or Amazon S3 (`@aws-sdk/client-s3`) via `utils/storage.js` |
| Payments | Razorpay (orders + HMAC signature verification + webhook) |
| Messaging | Nodemailer (SMTP), Twilio or generic HTTP SMS |
| Infra/CI | GitHub Actions (build + syntax check) |

## 3. Repository layout

```
client/                 React SPA
  src/
    pages/              Route screens (public, seeker, vendor, admin/*)
    components/         Shared UI (Navbar, JobCard, RichTextEditor, …)
    store/              jobsApi.js (RTK Query), authSlice, store
    api/                axios instance (token + refresh interceptor)
    utils/              sanitizeHtml, …
server/                 Express API
  src/
    routes/             one router per domain (auth, jobs, workers, …)
    controllers/        request handlers
    models/             Mongoose schemas
    middleware/         auth, uploads (multer), error handler
    utils/              storage, mailer, sms, tokens, webhooks, subscription
    jobs/               blogScheduler (node-cron automation)
    scripts/            seed.js, etl.js, memdb.js
docs/                   architecture, features, test cases, S3 setup
```

## 4. Authentication & session flow

- **Access token**: short-lived JWT, sent as `Authorization: Bearer`. Held in
  memory on the client (Redux), never persisted.
- **Refresh token**: httpOnly cookie. `refreshTokenVersion` on the user allows
  server-side revocation (incremented on logout / password change).
- On app load the client calls `/auth/refresh` to silently restore a session.

```mermaid
sequenceDiagram
  participant U as User
  participant C as React SPA
  participant A as API
  participant DB as MongoDB

  U->>C: enter email + password
  C->>A: POST /api/auth/login
  A->>DB: find user, bcrypt.compare
  alt phone signup not verified
    A-->>C: requiresVerification → OTP screen
  else verified
    A-->>C: accessToken + sets refresh cookie
    C->>C: store token in Redux
  end
  Note over C,A: later — token expires
  C->>A: request → 401
  C->>A: POST /api/auth/refresh (cookie)
  A-->>C: new accessToken (if refreshTokenVersion matches)
  C->>A: retry original request
```

Roles: `seeker`, `vendor`, `admin`. `requireAuth` loads the user (without the
password hash); `requireRole(...)` and `requireActiveSubscription` gate
sensitive routes. The client mirrors this with `<ProtectedRoute roles=[...]>`.

## 5. Core domain flows

### 5.1 Job application

```mermaid
sequenceDiagram
  participant S as Seeker
  participant API
  participant DB
  participant V as Vendor (email)
  S->>API: POST /api/jobs/:id/apply
  API->>DB: create Application (unique jobId+userId)
  alt already applied
    API-->>S: 409 already applied
  else ok
    API->>DB: lookup vendor user email
    API-->>V: email "new application"
    API->>API: dispatch webhook application.created
    API-->>S: 201 created
  end
```

### 5.2 Contact-unlock & paid credits (vendors)

Vendors spend **credits** to reveal a worker's phone/email. Credits are bought
through Razorpay — never granted for free.

```mermaid
sequenceDiagram
  participant V as Vendor
  participant API
  participant RZP as Razorpay
  participant DB
  V->>API: POST /workers/:id/unlock
  alt has credits
    API->>DB: -1 credit, create ContactUnlock
    API-->>V: phone + email
  else no credits (402)
    V->>API: POST /payments/contact-pack/create-order {pack}
    API->>RZP: create order (price from AdminConfig.contactPacks)
    API-->>V: orderId + keyId
    V->>RZP: pay (checkout.js)
    V->>API: POST /payments/contact-pack/verify {signature}
    API->>API: HMAC verify
    API->>DB: +credits (only after verify)
    API-->>V: contactCredits updated
  end
```

### 5.3 Subscriptions & premium gating

`User.subscription = { plan, expiresAt }`. Purchase mirrors the contact-pack
flow (`/payments/subscribe/*`). Premium features (intro video upload) are
enforced server-side by `requireActiveSubscription`, not just hidden in the UI.

### 5.4 File upload (storage abstraction)

```mermaid
graph LR
  Req[multipart upload] --> Multer[multer disk storage]
  Multer --> PU["persistUpload(file, subdir)"]
  PU -->|S3 enabled| S3[(S3 bucket)] --> URLA[absolute URL]
  PU -->|else| Local[(/uploads)] --> URLR[/uploads/... URL]
```

S3 is configured from **Admin → Settings** (DB) or env vars; DB takes
precedence. See [S3_SETUP.md](S3_SETUP.md).

## 6. Data model (key collections)

```mermaid
erDiagram
  USER ||--o| VENDOR : "is (role=vendor)"
  USER ||--o{ APPLICATION : submits
  JOB  ||--o{ APPLICATION : receives
  VENDOR ||--o{ JOB : posts
  VENDOR ||--o{ REVIEW : receives
  USER ||--o{ REVIEW : writes
  VENDOR ||--o{ CONTACTUNLOCK : unlocks
  USER ||--o{ CONTACTUNLOCK : "unlocked (worker)"
  USER ||--o{ PAYMENT : makes
  USER ||--o{ CHATMESSAGE : sends
```

- **User** — auth, role, `workerProfile` (seeker), `contactCredits` (vendor),
  `subscription`. Indexes on `workerProfile.skillCategory` and a 2dsphere geo
  index.
- **Vendor** — org profile, `paymentStatus`, featured flag, documents/logo/video.
- **Job** — title/description (text index), category/district (indexes), geo
  (2dsphere), `status` open/closed.
- **Application** — unique compound index `{jobId, userId}`; status workflow.
- **Payment** — `type` = vendor_signup | subscription | contactPack; Razorpay ids.
- **AdminConfig** — singleton (`_id: "config"`) holding all runtime settings
  (branding, fees, plans, integrations, S3).
- **Blog, Banner, Review, Webhook, ChatMessage, ContactUnlock, ActivityLog,
  EtlRun**.

## 7. Cross-cutting concerns

- **Rate limiting**: strict on `/api/auth` (50/15min), general on `/api` (600/15min).
- **Security headers**: `helmet`; CORS locked to `CLIENT_URL` with credentials.
- **HTML safety**: admin-authored HTML sanitized with DOMPurify on render.
- **Error handling**: central handler; generic 5xx message in production,
  duplicate-key → 409, ValidationError → 400.
- **Health**: `/health` reports DB connection state for orchestrator probes.
- **Graceful shutdown**: SIGTERM/SIGINT drain HTTP + close Mongo.
- **Background jobs**: `node-cron` blog automation (`jobs/blogScheduler.js`).
- **Webhooks**: outbound events (job/application/blog) dispatched to configured
  endpoints; Razorpay inbound webhook is the payment source of truth.

## 8. Request lifecycle

```mermaid
graph LR
  A[Client RTK Query] --> B["/api proxy (dev) / same origin (prod)"]
  B --> C[helmet + cors + json/urlencoded]
  C --> D[rate limiter]
  D --> E[route → requireAuth/role/subscription]
  E --> F[controller]
  F --> G[(Mongo)]
  F --> H[utils: storage/mail/sms/razorpay]
  F --> I[errorHandler on throw]
  F --> A
```

## 9. Environments & deployment

- **Dev**: Vite dev server (`:3000`) proxies `/api` and `/uploads` to the API
  (`:5000`). MongoDB local or `mongodb-memory-server` (`scripts/memdb.js`).
- **Prod**: build the client (`vite build`) and serve statically; run the API
  with a process manager; point `MONGO_URI` at a managed DB; enable S3 so
  uploads survive redeploys; set real Razorpay/SMTP/SMS credentials (env or
  admin panel).

## 10. Known gaps / roadmap

Tracked from the codebase review. High-impact items still open:

| Area | Item |
|------|------|
| Features | Resume upload; in-app notifications; saved/bookmarked jobs; real-time chat (currently 30s polling); job expiry & view counts |
| Quality | Automated test suite (see [TEST_CASES.md](TEST_CASES.md)); request validation library (joi/zod); OpenAPI docs |
| Performance | Image compression on upload; config caching |
| Security | Encrypt integration secrets at rest; sandbox admin `analyticsScript` |

See [FEATURES.md](FEATURES.md) for the full feature inventory and
[TEST_CASES.md](TEST_CASES.md) for the test plan.
