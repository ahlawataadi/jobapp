import fs from "fs";
import path from "path";

/**
 * Storage abstraction for uploaded files.
 *
 * By default files are kept on local disk and served from /uploads (current
 * behaviour). When S3 is configured via env vars the same files are pushed to
 * the bucket and a public URL is returned instead, so the app can run on
 * ephemeral / multi-instance hosts without losing uploads.
 *
 * Enable S3 by setting STORAGE_DRIVER=s3 plus:
 *   S3_BUCKET, S3_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
 * Optionally S3_PUBLIC_URL (e.g. a CloudFront domain) to build returned URLs.
 *
 * See docs/S3_SETUP.md for the full setup guide.
 */

export const isS3Enabled = () =>
  process.env.STORAGE_DRIVER === "s3" && !!process.env.S3_BUCKET && !!process.env.S3_REGION;

let _client = null;
async function getClient() {
  if (_client) return _client;
  // Lazy-load so the dependency is only required when S3 is actually enabled.
  const { S3Client } = await import("@aws-sdk/client-s3");
  _client = new S3Client({ region: process.env.S3_REGION });
  return _client;
}

function publicUrl(key) {
  const base = process.env.S3_PUBLIC_URL;
  if (base) return `${base.replace(/\/+$/, "")}/${key}`;
  return `https://${process.env.S3_BUCKET}.s3.${process.env.S3_REGION}.amazonaws.com/${key}`;
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
  if (!isS3Enabled()) return localUrl;

  const key = `${subdir}/${file.filename}`;
  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  const client = await getClient();
  const body = fs.readFileSync(file.path);
  const contentType = file.mimetype || MIME_BY_EXT[path.extname(file.filename).toLowerCase()] || "application/octet-stream";

  await client.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000, immutable",
  }));

  // Local copy was only a staging area; remove it to avoid filling the disk.
  fs.promises.unlink(file.path).catch(() => {});
  return publicUrl(key);
}
