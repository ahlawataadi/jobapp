# S3 File Storage — Setup Guide

By default the app stores uploaded files (logos, avatars, page/editor images,
vendor docs, intro videos) on the server's **local disk** under `server/uploads/`
and serves them from `/uploads`. That works for a single long-lived server but
breaks on multi-instance or ephemeral hosts (Render, Railway, Fly, Heroku,
containers, serverless) where the disk is not shared and is wiped on redeploy.

Switching to Amazon S3 fixes that: uploads go to a bucket and the app stores a
public URL. **No code changes are needed** — it's all driven by environment
variables. The app falls back to local disk whenever S3 is not configured, so
you can set this up whenever you're ready.

---

## What you need

- An AWS account
- ~10 minutes

## Step 1 — Create an S3 bucket

1. Go to the **S3 console** → **Create bucket**.
2. Pick a globally-unique name, e.g. `haryana-jobapp-uploads`.
3. Choose a region close to your users, e.g. `ap-south-1` (Mumbai). Note the
   region code — you'll need it.
4. Leave the rest at defaults and create the bucket.

## Step 2 — Allow public read of uploaded objects

Uploaded images need to be viewable by anyone visiting the site.

1. Open the bucket → **Permissions** → **Block public access** → **Edit** →
   uncheck **Block all public access** → save/confirm.
2. **Permissions** → **Bucket policy** → paste (replace the bucket name):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadForUploads",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::haryana-jobapp-uploads/*"
    }
  ]
}
```

> Prefer not to make the bucket public? Keep it private and put **CloudFront**
> in front of it (see Step 6), then set `S3_PUBLIC_URL` to the CloudFront domain.

## Step 3 — Create an IAM user for the app

1. **IAM console** → **Users** → **Create user** (e.g. `jobapp-uploader`).
2. **Attach policies directly** → **Create inline policy** → JSON:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::haryana-jobapp-uploads/*"
    }
  ]
}
```

3. Finish creating the user, then open it → **Security credentials** →
   **Create access key** → choose **Application running outside AWS** →
   copy the **Access key ID** and **Secret access key**.

## Step 4 — Enter the credentials

You can configure S3 **two ways**. The admin panel takes precedence; env vars
are used as a fallback when the admin fields are blank.

### Option A (recommended) — Admin panel

1. Log in as admin → **Admin → Settings → File storage (Amazon S3)**.
2. Tick **Enable S3 storage**, fill in **Bucket**, **Region**, **Access Key ID**,
   **Secret Access Key**, and optionally the **Public URL / CDN**.
3. **Save storage settings.** Changes take effect immediately — no restart.

### Option B — Environment variables

In `server/.env` (or your host's env settings):

```env
STORAGE_DRIVER=s3
S3_BUCKET=haryana-jobapp-uploads
S3_REGION=ap-south-1
AWS_ACCESS_KEY_ID=AKIA...your key...
AWS_SECRET_ACCESS_KEY=...your secret...
# Optional CDN domain (Step 6). If unset, the default bucket URL is used.
S3_PUBLIC_URL=
```

The AWS SDK (`@aws-sdk/client-s3`) is already a dependency — nothing to install.

## Step 5 — Restart and verify

1. Restart the server (`npm run dev` or `npm start` in `server/`).
2. Log in as admin → **Admin → Pages → About Us** → upload a featured image,
   or upload an inline image in the rich text editor, and **Save**.
3. The image URL stored will now be an absolute S3 (or CloudFront) URL like
   `https://haryana-jobapp-uploads.s3.ap-south-1.amazonaws.com/branding/...png`.
4. Open the public **About Us** page and confirm the image loads.

If `STORAGE_DRIVER` is anything other than `s3`, or the bucket/region are
missing, the app silently keeps using local disk — so a misconfiguration never
takes uploads down, it just falls back.

## Step 6 — (Optional) CloudFront CDN

For faster global delivery and to keep the bucket private:

1. **CloudFront** → **Create distribution** → origin = your S3 bucket
   (use **Origin Access Control** so only CloudFront can read the bucket; you
   can then re-enable "Block all public access" on the bucket).
2. After it deploys, copy the distribution domain
   (e.g. `https://d111111abcdef8.cloudfront.net`).
3. Set `S3_PUBLIC_URL=https://d111111abcdef8.cloudfront.net` and restart.

## How it works (for reference)

- `server/src/utils/storage.js` exposes `persistUpload(file, subdir)`.
- All upload controllers call it after Multer writes the temp file to disk.
- **Local mode:** returns `/uploads/<subdir>/<filename>` (served by Express).
- **S3 mode:** uploads the file to `<subdir>/<filename>` in the bucket, deletes
  the local temp copy, and returns the public URL.
- Existing uploads created before enabling S3 keep their `/uploads/...` URLs.
  To migrate them, copy `server/uploads/**` into the bucket preserving the
  folder structure (e.g. `aws s3 sync server/uploads s3://haryana-jobapp-uploads`)
  — the relative paths won't resolve once you move off the original disk.

## Files involved

| File | Role |
|------|------|
| `server/src/utils/storage.js` | Storage abstraction (local ↔ S3) |
| `server/src/controllers/*` | Call `persistUpload(...)` for each upload |
| `server/.env` | `STORAGE_DRIVER` + S3 credentials |
