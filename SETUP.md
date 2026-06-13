# Haryana Job Marketplace — Setup & Deployment Guide

A MERN-stack job marketplace: React (Vite) frontend, Node/Express backend, MongoDB database,
Razorpay payments with a backend-controlled vendor signup fee toggle.

---

## 1. Project Structure

```
jobapp/
├── client/              # React (Vite) frontend
├── server/              # Express API
│   ├── src/
│   │   ├── models/      # User, Vendor, Job, Application, Payment, AdminConfig, Review
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── middleware/
│   │   └── scripts/seed.js   # seeds Haryana demo data
├── docker-compose.yml
└── .github/workflows/   # CI + Docker build/push
```

---

## 2. Local Development Setup

### Prerequisites
- Node.js 20+
- Git
- MongoDB (local install OR a free MongoDB Atlas cluster — recommended)
- A Razorpay account (test mode is fine to start)

### 2.1 Clone & install

```bash
git clone <your-repo-url> jobapp
cd jobapp

cd server && npm install
cd ../client && npm install
```

### 2.2 Configure environment variables

**server/.env** (copy from `server/.env.example`):

```env
NODE_ENV=development
PORT=5000

MONGO_URI=mongodb://localhost:27017/jobapp
REDIS_URL=redis://localhost:6379

JWT_ACCESS_SECRET=<generate with: openssl rand -hex 32>
JWT_REFRESH_SECRET=<generate with: openssl rand -hex 32>
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

CLIENT_URL=http://localhost:3000

RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxx

ADMIN_EMAIL=admin@jobapp.local
ADMIN_PASSWORD=ChangeMe123!
```

**client/.env** (copy from `client/.env.example`):

```env
VITE_API_URL=http://localhost:5000/api
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
```

> Never commit real `.env` files — they're already gitignored.

### 2.3 Run MongoDB locally (quickest: Docker)

```bash
docker run -d --name jobapp-mongo -p 27017:27017 -v jobapp_mongo_data:/data/db mongo:7
```

### 2.4 Seed demo data (Haryana vendors + jobs + admin user)

```bash
cd server
npm run seed
```

This creates:
- An admin user (`ADMIN_EMAIL` / `ADMIN_PASSWORD`)
- 6 demo vendors across Gurugram, Faridabad, Hisar, Panipat, Panchkula
- ~10 sample job postings (medical lab, logistics, manufacturing, IT)
- Default `AdminConfig` with `paymentRequired = false` (vendor signup is free by default)

### 2.5 Run the app

```bash
# Terminal 1 — backend
cd server
npm run dev      # http://localhost:5000

# Terminal 2 — frontend
cd client
npm run dev      # http://localhost:3000
```

Visit **http://localhost:3000**. Log in as admin using the credentials from `.env`,
or register a new seeker/vendor account.

---

## 3. Razorpay Setup

1. Sign up at https://dashboard.razorpay.com (test mode is enabled by default).
2. Go to **Settings → API Keys** → generate **Key ID** and **Key Secret**.
   Put these in `server/.env` (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`) and
   `client/.env` (`VITE_RAZORPAY_KEY_ID` — Key ID only, never the secret).
3. Go to **Settings → Webhooks** → add a webhook pointing to:
   `https://<your-domain>/api/payments/webhook`
   - Active event: `payment.captured`
   - Copy the **Webhook Secret** into `RAZORPAY_WEBHOOK_SECRET`.
4. Test card (test mode): `4111 1111 1111 1111`, any future expiry, any CVV.

### Toggling the vendor signup fee

As **admin**, go to `/admin` in the app:
- Toggle **"Require payment for vendor signup"**
- Set the fee amount in ₹ (stored internally in paise)

When enabled, new vendors must pay via Razorpay before their account is activated
(`Vendor.status` moves from `pending` → `active` after payment verification).
When disabled, vendors are activated immediately on signup.

---

## 4. Database: MongoDB Atlas (production)

1. Create a free cluster at https://www.mongodb.com/cloud/atlas
2. Database Access → create a user with a strong password
3. Network Access → add your server's IP (or `0.0.0.0/0` if behind a firewall you control)
4. Get the connection string and set it as `MONGO_URI` in production env:
   ```
   mongodb+srv://<user>:<password>@<cluster>.mongodb.net/jobapp?retryWrites=true&w=majority
   ```
5. Run the seed script once against production (from a machine with the prod `.env`):
   ```bash
   cd server
   NODE_ENV=production npm run seed
   ```

---

## 5. Running with Docker Compose (single VM)

This is the fastest path to "online" — one VM running Mongo, Redis, API, and frontend.

```bash
# from repo root
cp server/.env.example server/.env   # fill in real values
docker compose up -d --build
```

- Frontend: `http://<server-ip>:3000`
- Backend: `http://<server-ip>:5000`

Run the seed once inside the running server container:

```bash
docker compose exec server npm run seed
```

### Putting it behind a domain (recommended)

Install **nginx** or **Caddy** on the host as a reverse proxy + TLS terminator:

```nginx
server {
    server_name yourdomain.com;
    location / {
        proxy_pass http://localhost:3000;
    }
    location /api/ {
        proxy_pass http://localhost:5000;
    }
}
```

Then use [Certbot](https://certbot.eff.org/) for free HTTPS:

```bash
sudo certbot --nginx -d yourdomain.com
```

Update `CLIENT_URL` (server `.env`) and `VITE_API_URL` (client build) to your real domain
(e.g. `https://yourdomain.com/api`) and rebuild.

---

## 6. GitHub Repository & CI/CD

### 6.1 Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: Haryana Job Marketplace"
gh repo create jobapp --private --source=. --remote=origin
git push -u origin main
```

### 6.2 CI (already configured)

`.github/workflows/ci.yml` runs on every PR/push to `main`:
- Installs server deps, syntax-checks the entry file
- Installs client deps, runs `npm run build`

### 6.3 Image build & publish

`.github/workflows/deploy.yml` builds Docker images for `server` and `client` and
pushes them to **GitHub Container Registry** (`ghcr.io/<owner>/<repo>/server` and `.../client`)
on every push to `main`.

To set the frontend's API URL at build time, add **repo variables**
(Settings → Secrets and variables → Actions → Variables):
- `VITE_API_URL` = `https://yourdomain.com/api`
- `VITE_RAZORPAY_KEY_ID` = your live/test Razorpay key id

### 6.4 Auto-deploy to your server (optional)

Uncomment the `deploy` job in `deploy.yml` and add repo secrets:
- `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`

On your server, create `/opt/jobapp/docker-compose.yml` pointing at the
`ghcr.io/...` images instead of `build:`, plus a real `server/.env`. The deploy
job will SSH in, `docker compose pull && up -d` after each push to `main`.

---

## 7. Production Environment Checklist

- [ ] Generate strong, unique `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`
- [ ] Set `NODE_ENV=production`
- [ ] Use MongoDB Atlas (or a managed Mongo) with backups enabled
- [ ] Set real Razorpay **live** keys + webhook secret (separate from test keys)
- [ ] Set `CLIENT_URL` to your real frontend origin (CORS)
- [ ] HTTPS via reverse proxy (nginx/Caddy + Certbot)
- [ ] Run `npm run seed` once to bootstrap admin user + demo data (or replace with real vendor data)
- [ ] Change the seeded `ADMIN_PASSWORD` immediately after first login
- [ ] Set up basic monitoring (e.g., `docker compose logs -f`, or Grafana/Prometheus later)
- [ ] Configure regular MongoDB backups (Atlas does this automatically on paid tiers)

---

## 8. Default Login Credentials (after seeding)

| Role  | Email                  | Password       |
|-------|------------------------|----------------|
| Admin | value of `ADMIN_EMAIL` | `ADMIN_PASSWORD` |
| Vendor (demo) | `<orgname>@vendor.jobapp.local` (see console output of seed) | `VendorPass123!` |

**Change these immediately in production.**

---

## 9. Next Steps / Extensibility

- Add Redis-backed caching for `/api/jobs` search results (Redis container is already in `docker-compose.yml`, just wire it into `jobController.listJobs`)
- Add Atlas Search index on `Job.title`/`description` for better full-text relevance
- Add file upload (resumes) via S3/Cloudinary instead of `resumeUrl` text field
- Extend `industry`/`category` taxonomy as you onboard non-medical vendors
- Add Sentry for error tracking and Prometheus/Grafana for metrics
