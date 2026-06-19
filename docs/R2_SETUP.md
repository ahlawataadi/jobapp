# Cloudflare R2 File Storage — Setup Guide

By default the app stores uploaded files (logos, avatars, page/editor images,
vendor docs, resumes, intro videos) on the server's **local disk** under
`server/uploads/` and serves them from `/uploads`. That works for a single
long-lived server but breaks on multi-instance or ephemeral hosts (Render,
Railway, Fly, containers, serverless) where the disk is not shared and is wiped
on redeploy.

Switching to **Cloudflare R2** fixes that: uploads go to a bucket and the app
stores a public URL. R2 is S3-API compatible, so **no code changes are needed** —
it's all driven by settings. The app falls back to local disk whenever R2 is not
configured, so you can set this up whenever you're ready.

R2 has no egress fees, which makes it a cost-effective choice for serving media.

---

## What you need

- A Cloudflare account
- ~10 minutes

## Step 1 — Create an R2 bucket

1. Cloudflare dashboard → **R2** → **Create bucket**.
2. Name it, e.g. `haryana-jobapp-uploads`. Location: Automatic is fine.
3. Create the bucket.

## Step 2 — Get your Account ID

On the **R2** overview page, copy your **Account ID** (a long hex string). The
app builds the S3 endpoint from it: `https://<accountId>.r2.cloudflarestorage.com`.

## Step 3 — Create an R2 API token (access keys)

1. **R2** → **Manage R2 API Tokens** → **Create API token**.
2. Permissions: **Object Read & Write** (optionally scope it to your bucket).
3. Create, then copy the **Access Key ID** and **Secret Access Key**
   (shown once).

## Step 4 — Make objects publicly readable

R2 buckets are private by default. Pick one:

- **Quick (r2.dev):** bucket → **Settings** → **Public access** → enable the
  **r2.dev** subdomain. You'll get a URL like `https://pub-xxxx.r2.dev`.
- **Production (custom domain):** bucket → **Settings** → **Custom Domains** →
  add e.g. `cdn.yoursite.com` (Cloudflare manages the DNS + TLS). Use that as
  the public URL.

> The S3 API endpoint (`*.r2.cloudflarestorage.com`) is **not** publicly
> readable — always set a public URL (r2.dev or custom domain) so uploaded
> files are viewable.

## Step 5 — Enter the credentials

Two ways — the admin panel takes precedence; env vars are the fallback.

### Option A (recommended) — Admin panel

1. Log in as admin → **Admin → Settings → File storage (Cloudflare R2)**.
2. Tick **Enable R2 storage**, fill in **Account ID**, **Bucket**,
   **Access Key ID**, **Secret Access Key**, and the **Public URL**
   (r2.dev or custom domain).
3. **Save storage settings.** Changes take effect immediately — no restart.

### Option B — Environment variables

In `server/.env` (or your host's env settings):

```env
STORAGE_DRIVER=r2
R2_ACCOUNT_ID=0a1b2c3d4e5f...
R2_BUCKET=haryana-jobapp-uploads
R2_ACCESS_KEY_ID=...your R2 access key...
R2_SECRET_ACCESS_KEY=...your R2 secret...
R2_PUBLIC_URL=https://pub-xxxx.r2.dev
```

No SDK or extra dependency is needed — R2 is called directly over HTTPS with
AWS SigV4 request signing (Node's built-in `crypto` + `fetch`).

## Step 6 — Verify

1. Restart the server if you used env vars (the admin-panel path needs no
   restart).
2. Log in as admin → **Admin → Pages → About Us** → upload a featured image, or
   upload an inline image in the rich text editor, and **Save**.
3. The stored URL will be your R2 public URL, e.g.
   `https://pub-xxxx.r2.dev/branding/...png`.
4. Open the public **About Us** page and confirm the image loads.

If `STORAGE_DRIVER` is anything other than `r2`, or the account ID/bucket are
missing, the app silently keeps using local disk — a misconfiguration never
takes uploads down, it just falls back.

## How it works (for reference)

- `server/src/utils/storage.js` exposes `persistUpload(file, subdir)`.
- All upload controllers call it after Multer writes the temp file to disk.
- **Local mode:** returns `/uploads/<subdir>/<filename>` (served by Express).
- **R2 mode:** PUTs to `<subdir>/<filename>` on the R2 S3-compatible endpoint
  using a hand-signed AWS SigV4 request (no SDK), deletes the local temp copy,
  and returns the public URL (`<publicUrl>/<subdir>/<filename>`).
- Existing uploads created before enabling R2 keep their `/uploads/...` URLs. To
  migrate them, copy `server/uploads/**` into the bucket preserving the folder
  structure (e.g. with `rclone` or the `aws s3 sync` CLI pointed at the R2
  endpoint).

## Files involved

| File | Role |
|------|------|
| `server/src/utils/storage.js` | Storage abstraction (local ↔ R2) |
| `server/src/controllers/*` | Call `persistUpload(...)` for each upload |
| `server/.env` | `STORAGE_DRIVER` + `R2_*` credentials |
| Admin → Settings | Runtime R2 config (`AdminConfig.r2Storage`) |
