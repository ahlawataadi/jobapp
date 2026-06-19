import fs from "fs";
import path from "path";
import https from "https";
import crypto from "crypto";
import { getConfig } from "../models/AdminConfig.js";

/**
 * Storage abstraction for uploaded files.
 *
 * By default files are kept on local disk and served from /uploads. When
 * Cloudflare R2 is configured the same files are uploaded to the bucket and a
 * public URL is returned instead, so the app can run on ephemeral /
 * multi-instance hosts without losing uploads.
 *
 * R2 is integrated natively over HTTPS with AWS SigV4 request signing (Node's
 * built-in crypto + https) — no AWS SDK dependency, and no reliance on global
 * fetch (which isn't present on older Node runtimes). Config comes from the
 * Admin → Settings page (AdminConfig.r2Storage); env vars (STORAGE_DRIVER=r2 +
 * R2_*) are the fallback. See docs/R2_SETUP.md.
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
  const accessKeyId = db.accessKeyId || process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = db.secretAccessKey || process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !bucket || !accessKeyId || !secretAccessKey) return null;

  return {
    accountId,
    bucket,
    accessKeyId,
    secretAccessKey,
    // Public bucket domain (r2.dev) or a custom domain. Required to build a
    // reachable URL — the S3 API endpoint itself is not publicly readable.
    publicUrl: db.publicUrl || process.env.R2_PUBLIC_URL || "",
  };
}

const sha256hex = (data) => crypto.createHash("sha256").update(data).digest("hex");
const hmac = (key, data) => crypto.createHmac("sha256", key).update(data).digest();
// Encode a key into a canonical URI path: encode each segment, keep the slashes.
const encodeKey = (key) => key.split("/").map(encodeURIComponent).join("/");

// Storage errors are safe to show the user (they carry R2's own status/message,
// no secrets) — mark them so the error handler doesn't mask them as a 500.
function storageError(message) {
  const err = new Error(message);
  err.status = 502;
  err.expose = true;
  return err;
}

/**
 * Upload an object to Cloudflare R2 via the S3-compatible REST API, signed with
 * AWS Signature V4. Uses Node's https module (no SDK, no global fetch).
 */
function r2PutObject(r2, key, body, contentType) {
  const host = `${r2.accountId}.r2.cloudflarestorage.com`;
  const region = "auto";
  const service = "s3";

  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, ""); // YYYYMMDDTHHMMSSZ
  const dateStamp = amzDate.slice(0, 8);
  const canonicalUri = `/${r2.bucket}/${encodeKey(key)}`;
  const payloadHash = sha256hex(body);

  const canonicalHeaders =
    `content-type:${contentType}\n` +
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";

  const canonicalRequest = ["PUT", canonicalUri, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const scope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256hex(canonicalRequest)].join("\n");

  let signingKey = hmac(`AWS4${r2.secretAccessKey}`, dateStamp);
  signingKey = hmac(signingKey, region);
  signingKey = hmac(signingKey, service);
  signingKey = hmac(signingKey, "aws4_request");
  const signature = crypto.createHmac("sha256", signingKey).update(stringToSign).digest("hex");

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${r2.accessKeyId}/${scope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        method: "PUT",
        hostname: host,
        path: canonicalUri,
        headers: {
          "Content-Type": contentType,
          "Content-Length": body.length,
          "x-amz-content-sha256": payloadHash,
          "x-amz-date": amzDate,
          Authorization: authorization,
        },
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          if (res.statusCode >= 200 && res.statusCode < 300) return resolve();
          const text = Buffer.concat(chunks).toString().replace(/\s+/g, " ").slice(0, 300);
          reject(storageError(`R2 upload failed (${res.statusCode}): ${text}`));
        });
      }
    );
    req.on("error", (e) => reject(storageError(`R2 connection error: ${e.message}`)));
    req.write(body);
    req.end();
  });
}

function publicUrl(r2, key) {
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
  const body = fs.readFileSync(file.path);
  const contentType = file.mimetype || MIME_BY_EXT[path.extname(file.filename).toLowerCase()] || "application/octet-stream";

  await r2PutObject(r2, key, body, contentType);

  // Local copy was only a staging area; remove it to avoid filling the disk.
  fs.promises.unlink(file.path).catch(() => {});
  return publicUrl(r2, key);
}
