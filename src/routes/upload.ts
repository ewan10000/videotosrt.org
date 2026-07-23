import { Hono } from "hono";
import { createId, nowIso } from "../lib/env";
import { fail, ok } from "../lib/response";
import { requireUser } from "../lib/session";
import type { HonoAppEnv } from "../types";

export const MAX_UPLOAD_BYTES = 1 * 1024 * 1024 * 1024;
const LEGACY_WORKER_UPLOAD_BYTES = 25 * 1024 * 1024;
const FALLBACK_CONTENT_TYPE = "application/octet-stream";
const SAFE_CONTENT_TYPE_PATTERN = /^(audio|video)\/[a-z0-9.+-]+$/i;

export const uploadRoutes = new Hono<HonoAppEnv>();

function extensionFor(filename: string) {
  const match = filename.match(/\.([a-z0-9]{1,12})$/i);
  return match ? `.${match[1].toLowerCase()}` : "";
}

function sanitizeFilename(value: string) {
  const leafName = value.replaceAll("\\", "/").split("/").pop()?.trim() || "upload";
  const safeName = leafName.replace(/[^\w .()+-]/g, "_").replace(/\s+/g, " ").slice(0, 160).trim();
  return safeName || "upload";
}

function parseUploadSize(value: string | undefined) {
  if (!value?.trim()) {
    return { ok: false as const, status: 400, code: "INVALID_SIZE", message: "size is required" };
  }

  const size = Number(value);
  if (!Number.isSafeInteger(size)) {
    return { ok: false as const, status: 400, code: "INVALID_SIZE", message: "size must be a whole number of bytes" };
  }
  if (size <= 0) {
    return { ok: false as const, status: 400, code: "EMPTY_FILE", message: "Uploaded file is empty" };
  }
  if (size > MAX_UPLOAD_BYTES) {
    return { ok: false as const, status: 413, code: "FILE_TOO_LARGE", message: "File must be 1 GB or smaller for transcription" };
  }

  return { ok: true as const, size };
}

function normalizeContentType(value: string | undefined) {
  const contentType = value?.trim().toLowerCase() || FALLBACK_CONTENT_TYPE;
  if (contentType === FALLBACK_CONTENT_TYPE || SAFE_CONTENT_TYPE_PATTERN.test(contentType)) {
    return contentType;
  }
  return null;
}

function encodeKey(key: string) {
  return encodeURIComponent(key).replaceAll("%2F", "/");
}

function amzDate(date: Date) {
  return date.toISOString().replaceAll("-", "").replaceAll(":", "").replace(/\.\d{3}Z$/, "Z");
}

function dateStamp(date: Date) {
  return amzDate(date).slice(0, 8);
}

function hex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256(value: string) {
  return hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

async function hmac(key: ArrayBuffer | Uint8Array, value: string) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(value));
}

async function signingKey(secretAccessKey: string, date: string) {
  const dateKey = await hmac(new TextEncoder().encode(`AWS4${secretAccessKey}`), date);
  const regionKey = await hmac(dateKey, "auto");
  const serviceKey = await hmac(regionKey, "s3");
  return hmac(serviceKey, "aws4_request");
}

async function presignedR2Url(env: HonoAppEnv["Bindings"], key: string, expiresSeconds = 21600) {
  const endpoint = new URL(env.R2_ENDPOINT);
  const date = new Date();
  const ymd = dateStamp(date);
  const timestamp = amzDate(date);
  const credentialScope = `${ymd}/auto/s3/aws4_request`;
  const canonicalUri = `/${env.R2_BUCKET_NAME}/${encodeKey(key)}`;
  const params = new URLSearchParams({
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${env.R2_ACCESS_KEY_ID}/${credentialScope}`,
    "X-Amz-Date": timestamp,
    "X-Amz-Expires": String(expiresSeconds),
    "X-Amz-SignedHeaders": "host",
  });
  const canonicalQuery = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(value)}`)
    .join("&");
  const canonicalRequest = [
    "GET",
    canonicalUri,
    canonicalQuery,
    `host:${endpoint.host}`,
    "",
    "host",
    "UNSIGNED-PAYLOAD",
  ].join("\n");
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    timestamp,
    credentialScope,
    await sha256(canonicalRequest),
  ].join("\n");
  const signature = hex(await hmac(await signingKey(env.R2_SECRET_ACCESS_KEY, ymd), stringToSign));

  return `${endpoint.origin}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

async function presignedPutR2Url(
  env: HonoAppEnv["Bindings"],
  key: string,
  contentType: string,
  expiresSeconds = 600,
) {
  const endpoint = new URL(env.R2_ENDPOINT);
  const date = new Date();
  const ymd = dateStamp(date);
  const timestamp = amzDate(date);
  const credentialScope = `${ymd}/auto/s3/aws4_request`;
  const canonicalUri = `/${env.R2_BUCKET_NAME}/${encodeKey(key)}`;
  const params = new URLSearchParams({
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${env.R2_ACCESS_KEY_ID}/${credentialScope}`,
    "X-Amz-Date": timestamp,
    "X-Amz-Expires": String(expiresSeconds),
    "X-Amz-SignedHeaders": "content-type;host",
  });
  const canonicalQuery = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(value)}`)
    .join("&");
  const canonicalRequest = [
    "PUT",
    canonicalUri,
    canonicalQuery,
    `content-type:${contentType}`,
    `host:${endpoint.host}`,
    "",
    "content-type;host",
    "UNSIGNED-PAYLOAD",
  ].join("\n");
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    timestamp,
    credentialScope,
    await sha256(canonicalRequest),
  ].join("\n");
  const signature = hex(await hmac(await signingKey(env.R2_SECRET_ACCESS_KEY, ymd), stringToSign));

  return `${endpoint.origin}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

async function publicR2Url(env: HonoAppEnv["Bindings"], key: string) {
  const optionalEnv = env as HonoAppEnv["Bindings"] & { R2_PUBLIC_URL?: string };
  if (optionalEnv.R2_PUBLIC_URL) {
    return `${optionalEnv.R2_PUBLIC_URL.replace(/\/$/, "")}/${encodeKey(key)}`;
  }

  return presignedR2Url(env, key);
}

async function verifyOwnedUploadObject(env: HonoAppEnv["Bindings"], key: string) {
  const object = await env.R2.head(key);
  if (!object) {
    return { ok: false as const, status: 404, code: "UPLOAD_NOT_FOUND", message: "Upload was not found. Please upload the file again." };
  }

  if (object.size <= 0) {
    await env.R2.delete(key);
    return { ok: false as const, status: 400, code: "EMPTY_FILE", message: "Uploaded file is empty" };
  }

  if (object.size > MAX_UPLOAD_BYTES) {
    await env.R2.delete(key);
    return { ok: false as const, status: 413, code: "FILE_TOO_LARGE", message: "File must be 1 GB or smaller for transcription" };
  }

  return { ok: true as const, size: object.size };
}

uploadRoutes.get("/upload/presign", async (c) => {
  const user = requireUser(c);
  if (!user) return fail(c, 401, "UNAUTHORIZED", "Authentication required");

  const sizeResult = parseUploadSize(c.req.query("size"));
  if (!sizeResult.ok) {
    return fail(c, sizeResult.status, sizeResult.code, sizeResult.message);
  }

  const contentType = normalizeContentType(c.req.query("contentType"));
  if (!contentType) {
    return fail(c, 400, "INVALID_CONTENT_TYPE", "contentType must be an audio or video MIME type");
  }

  const filename = sanitizeFilename(c.req.query("filename") ?? "upload");
  const key = `uploads/${user.id}/${createId("media")}${extensionFor(filename)}`;

  // R2 bucket CORS must allow PUT from https://videotosrt.org with the Content-Type header.
  // Configure this on bucket r2tong0607 via Cloudflare dashboard or the S3-compatible API.
  return ok(c, {
    url: await presignedPutR2Url(c.env, key, contentType),
    key,
    filename,
    contentType,
    size: sizeResult.size,
  });
});

uploadRoutes.get("/upload/url", async (c) => {
  const user = requireUser(c);
  if (!user) return fail(c, 401, "UNAUTHORIZED", "Authentication required");

  const key = c.req.query("key")?.trim();
  if (!key) {
    return fail(c, 400, "KEY_REQUIRED", "key is required");
  }

  if (!key.startsWith(`uploads/${user.id}/`)) {
    return fail(c, 403, "FORBIDDEN", "Cannot access this upload");
  }

  const verified = await verifyOwnedUploadObject(c.env, key);
  if (!verified.ok) {
    return fail(c, verified.status, verified.code, verified.message);
  }

  return ok(c, {
    url: await publicR2Url(c.env, key),
    size: verified.size,
  });
});

uploadRoutes.post("/upload", async (c) => {
  const user = requireUser(c);
  if (!user) return fail(c, 401, "UNAUTHORIZED", "Authentication required");

  const body = await c.req.parseBody();
  const file = body.file;
  if (!(file instanceof File)) {
    return fail(c, 400, "FILE_REQUIRED", "multipart/form-data field 'file' is required");
  }

  if (file.size <= 0) {
    return fail(c, 400, "EMPTY_FILE", "Uploaded file is empty");
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return fail(c, 413, "FILE_TOO_LARGE", "File must be 1 GB or smaller for transcription");
  }

  if (file.size > LEGACY_WORKER_UPLOAD_BYTES) {
    return fail(c, 413, "WORKER_UPLOAD_TOO_LARGE", "Direct browser upload to R2 is required for files this large");
  }

  const filename = sanitizeFilename(file.name || "upload");
  const key = `uploads/${user.id}/${createId("media")}${extensionFor(filename)}`;
  const uploadedAt = nowIso();

  await c.env.R2.put(key, file.stream(), {
    httpMetadata: {
      contentType: file.type || "application/octet-stream",
    },
    customMetadata: {
      user_id: user.id,
      filename,
      uploaded_at: uploadedAt,
    },
  });

  return ok(c, {
    url: await publicR2Url(c.env, key),
    filename,
    size: file.size,
  });
});
