import fs from "fs";
import path from "path";
import { getConfig } from "../models/AdminConfig.js";

/**
 * Storage abstraction for uploaded files.
 *
 * By default files are kept on local disk and served from /uploads. When S3 is
 * configured the same files are pushed to the bucket and a public URL is
 * returned instead, so the app can run on ephemeral / multi-instance hosts.
 *
 * S3 is configured from the Admin → Settings page (stored on AdminConfig.
 * s3Storage); env vars (STORAGE_DRIVER=s3 + S3_*) act as a fallback when the
 * admin fields are blank. See docs/S3_SETUP.md.
 */

// Resolve effective S3 settings: admin-panel values take precedence, env is the
// fallback. Returns null when S3 is not enabled / not fully configured.
async function resolveS3() {
  let db = {};
  try {
    const cfg = await getConfig();
    db = cfg?.s3Storage?.toObject?.() || cfg?.s3Storage || {};
  } catch {
    db = {};
  }

  const enabled = db.enabled || process.env.STORAGE_DRIVER === "s3";
  if (!enabled) return null;

  const bucket = db.bucket || process.env.S3_BUCKET;
  const region = db.region || process.env.S3_REGION;
  if (!bucket || !region) return null;

  return {
    bucket,
    region,
    accessKeyId: db.accessKeyId || process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: db.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY || "",
    publicUrl: db.publicUrl || process.env.S3_PUBLIC_URL || "",
  };
}

let _client = null;
let _clientRegion = null;
async function getClient(s3) {
  // Recreate the client if the configured region changed at runtime.
  if (_client && _clientRegion === s3.region) return _client;
  const { S3Client } = await import("@aws-sdk/client-s3");
  _client = new S3Client({
    region: s3.region,
    // Use explicit creds when provided; otherwise fall back to the default
    // AWS credential chain (env vars / IAM role).
    ...(s3.accessKeyId && s3.secretAccessKey
      ? { credentials: { accessKeyId: s3.accessKeyId, secretAccessKey: s3.secretAccessKey } }
      : {}),
  });
  _clientRegion = s3.region;
  return _client;
}

function publicUrl(s3, key) {
  if (s3.publicUrl) return `${s3.publicUrl.replace(/\/+$/, "")}/${key}`;
  return `https://${s3.bucket}.s3.${s3.region}.amazonaws.com/${key}`;
}

const MIME_BY_EXT = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml",
  ".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime",
};

/**
 * Persist a multer disk-storage file and return the URL to store/serve.
 * @param {{filename: string, path: string, mimetype?: string}} file  req.file
 * @param {string} subdir  logical folder, e.g. "branding", "avatars", "videos"
 * @returns {Promise<string>}  "/uploads/<subdir>/<name>" locally, or an absolute S3 URL
 */
export async function persistUpload(file, subdir) {
  const localUrl = `/uploads/${subdir}/${file.filename}`;
  const s3 = await resolveS3();
  if (!s3) return localUrl;

  const key = `${subdir}/${file.filename}`;
  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  const client = await getClient(s3);
  const body = fs.readFileSync(file.path);
  const contentType = file.mimetype || MIME_BY_EXT[path.extname(file.filename).toLowerCase()] || "application/octet-stream";

  await client.send(new PutObjectCommand({
    Bucket: s3.bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000, immutable",
  }));

  // Local copy was only a staging area; remove it to avoid filling the disk.
  fs.promises.unlink(file.path).catch(() => {});
  return publicUrl(s3, key);
}
