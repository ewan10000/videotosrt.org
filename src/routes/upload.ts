import { Hono } from "hono";
import { createId, nowIso } from "../lib/env";
import { fail, ok } from "../lib/response";
import { requireUser } from "../lib/session";
import type { HonoAppEnv } from "../types";

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export const uploadRoutes = new Hono<HonoAppEnv>();

function extensionFor(filename: string) {
  const match = filename.match(/\.([a-z0-9]{1,12})$/i);
  return match ? `.${match[1].toLowerCase()}` : "";
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
    "X-Amz-SignedHeaders": "host",
  });
  const canonicalQuery = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(value)}`)
    .join("&");
  const canonicalRequest = [
    "PUT",
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

async function publicR2Url(env: HonoAppEnv["Bindings"], key: string) {
  const optionalEnv = env as HonoAppEnv["Bindings"] & { R2_PUBLIC_URL?: string };
  if (optionalEnv.R2_PUBLIC_URL) {
    return `${optionalEnv.R2_PUBLIC_URL.replace(/\/$/, "")}/${encodeKey(key)}`;
  }

  return presignedR2Url(env, key);
}

uploadRoutes.get("/upload/presign", async (c) => {
  const user = requireUser(c);
  if (!user) return fail(c, 401, "UNAUTHORIZED", "Authentication required");

  const filename = c.req.query("filename")?.trim() || "upload";
  const contentType = c.req.query("contentType")?.trim() || "application/octet-stream";
  const key = `uploads/${user.id}/${createId("media")}${extensionFor(filename)}`;

  // R2 bucket CORS must allow PUT from https://videotosrt.org with the Content-Type header.
  // Configure this on bucket r2tong0607 via Cloudflare dashboard or the S3-compatible API.
  return c.json({
    url: await presignedPutR2Url(c.env, key),
    key,
    filename,
    contentType,
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

  return c.json({ url: await publicR2Url(c.env, key) });
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
    return fail(c, 413, "FILE_TOO_LARGE", "File must be 25MB or smaller for transcription");
  }

  const filename = file.name || "upload";
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
