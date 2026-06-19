import fs from "fs";
import path from "path";
import { getConfig } from "../models/AdminConfig.js";

/**
 * Storage abstraction for uploaded files.
 *
 * By default files are kept on local disk and served from /uploads. When
 * Cloudflare R2 is configured the same files are pushed to the bucket and a
 * public URL is returned instead, so the app can run on ephemeral /
 * multi-instance hosts without losing uploads.
 *
 * R2 is S3-API compatible, so we reuse @aws-sdk/client-s3 pointed at the R2
 * endpoint (region "auto"). Config comes from the Admin → Settings page
 * (AdminConfig.r2Storage); env vars (STORAGE_DRIVER=r2 + R2_*) are the fallback.
 * See docs/R2_SETUP.md.
 */

// Resolve effective R2 settings: admin-panel values take precedence, env is the
// fallback. Returns null when R2 is not enabled / not fully configured.
async function resolveR2() {
  let db = {};
  try {
    const cfg = await getConfig();
    db = cfg?.r2Storage?.toObject?.() || cfg?.r2Storage || {};
  } catch {
    db = {};
  }

  const enabled = db.enabled || process.env.STORAGE_DRIVER === "r2";
  if (!enabled) return null;

  const accountId = db.accountId || process.env.R2_ACCOUNT_ID;
  const bucket = db.bucket || process.env.R2_BUCKET;
  if (!accountId || !bucket) return null;

  return {
    accountId,
    bucket,
    accessKeyId: db.accessKeyId || process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: db.secretAccessKey || process.env.R2_SECRET_ACCESS_KEY || "",
    // Public bucket domain (r2.dev) or a custom domain. Required to build a
    // reachable URL — the S3 API endpoint itself is not publicly readable.
    publicUrl: db.publicUrl || process.env.R2_PUBLIC_URL || "",
  };
}

let _client = null;
let _clientKey = null;
async function getClient(r2) {
  // Recreate the client if the configured account/keys changed at runtime.
  const key = `${r2.accountId}:${r2.accessKeyId}`;
  if (_client && _clientKey === key) return _client;
  const { S3Client } = await import("@aws-sdk/client-s3");
  _client = new S3Client({
    region: "auto",
    endpoint: `https://${r2.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: r2.accessKeyId, secretAccessKey: r2.secretAccessKey },
  });
  _clientKey = key;
  return _client;
}

function publicUrl(r2, key) {
  // R2 buckets aren't public via the API endpoint — a configured r2.dev or
  // custom domain is needed. Fall back to the dev endpoint path if unset.
  const base = r2.publicUrl
    ? r2.publicUrl.replace(/\/+$/, "")
    : `https://${r2.accountId}.r2.cloudflarestorage.com/${r2.bucket}`;
  return `${base}/${key}`;
}

const MIME_BY_EXT = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml",
  ".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime",
  ".pdf": "application/pdf", ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

/**
 * Persist a multer disk-storage file and return the URL to store/serve.
 * @param {{filename: string, path: string, mimetype?: string}} file  req.file
 * @param {string} subdir  logical folder, e.g. "branding", "avatars", "videos"
 * @returns {Promise<string>}  "/uploads/<subdir>/<name>" locally, or an absolute R2 URL
 */
export async function persistUpload(file, subdir) {
  const localUrl = `/uploads/${subdir}/${file.filename}`;
  const r2 = await resolveR2();
  if (!r2) return localUrl;

  const key = `${subdir}/${file.filename}`;
  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  const client = await getClient(r2);
  const body = fs.readFileSync(file.path);
  const contentType = file.mimetype || MIME_BY_EXT[path.extname(file.filename).toLowerCase()] || "application/octet-stream";

  await client.send(new PutObjectCommand({
    Bucket: r2.bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000, immutable",
  }));

  // Local copy was only a staging area; remove it to avoid filling the disk.
  fs.promises.unlink(file.path).catch(() => {});
  return publicUrl(r2, key);
}
