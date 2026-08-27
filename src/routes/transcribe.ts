import { Hono } from "hono";
import { consumeMinutes, refundJobMinutes } from "../lib/credits";
import { parseDurationSeconds } from "../lib/duration";
import { createId, nowIso } from "../lib/env";
import { getPlanQuota, normalizePlan } from "../lib/plans";
import { fail, ok } from "../lib/response";
import { requireUser } from "../lib/session";
import {
  APPLICATION_SIZE_ERROR_CODE,
  APPLICATION_SIZE_ERROR_MESSAGE,
  APPLICATION_TRANSCRIPTION_SIZE_LIMIT_BYTES,
  isGroqDirectSourceFormatSupported,
  MAX_TRANSCRIPTION_CHUNKS,
  parseFileSizeBytes,
  PROVIDER_COMPATIBLE_TRANSCRIPTION_SIZE_LIMIT_BYTES,
  PROVIDER_SIZE_ERROR_CODE,
  PROVIDER_SIZE_ERROR_MESSAGE,
  UNSUPPORTED_SOURCE_FORMAT_ERROR_CODE,
  UNSUPPORTED_SOURCE_FORMAT_ERROR_MESSAGE,
} from "../lib/transcription-limits";
import type { HonoAppEnv, TranscriptionJob, TranscriptionQueueMessage } from "../types";

export const transcribeRoutes = new Hono<HonoAppEnv>();

type OwnedStorageUrl = {
  key: string;
};

type VerifiedTranscriptionChunk = NonNullable<TranscriptionQueueMessage["chunks"]>[number] & {
  key: string;
};

function parseUrl(value: string) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function idempotentJobId(userId: string, key: string) {
  const digest = await sha256Hex(`${userId}:${key}`);
  return `job_${digest.slice(0, 40)}`;
}

function normalizeIdempotencyKey(value: unknown) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return null;
  const key = value.trim();
  return /^[A-Za-z0-9._:-]{8,160}$/.test(key) ? key : null;
}

function parseTranscriptionChunks(value: unknown) {
  if (value === undefined || value === null) return { ok: true as const, chunks: undefined };
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_TRANSCRIPTION_CHUNKS) {
    return { ok: false as const };
  }

  const chunks: NonNullable<TranscriptionQueueMessage["chunks"]> = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return { ok: false as const };
    const candidate = item as { audio_url?: unknown; duration_seconds?: unknown; file_size_bytes?: unknown };
    if (typeof candidate.audio_url !== "string" || !parseUrl(candidate.audio_url)) return { ok: false as const };
    const durationSeconds = parseDurationSeconds(candidate.duration_seconds);
    const fileSizeBytes = parseFileSizeBytes(candidate.file_size_bytes);
    if (durationSeconds === null || fileSizeBytes === null) return { ok: false as const };
    if (fileSizeBytes > PROVIDER_COMPATIBLE_TRANSCRIPTION_SIZE_LIMIT_BYTES) return { ok: false as const };
    chunks.push({ audioUrl: candidate.audio_url, durationSeconds, fileSizeBytes });
  }

  return { ok: true as const, chunks };
}

function chunkDurationMatchesSourceDuration(
  chunks: NonNullable<TranscriptionQueueMessage["chunks"]>,
  durationSeconds: number,
) {
  const chunkDurationSeconds = chunks.reduce((total, chunk) => total + chunk.durationSeconds, 0);
  const roundingToleranceSeconds = chunks.length;
  const metadataToleranceSeconds = Math.max(5, Math.ceil(durationSeconds * 0.01));
  return Math.abs(chunkDurationSeconds - durationSeconds) <= roundingToleranceSeconds + metadataToleranceSeconds;
}

function decodeUrlPath(url: URL) {
  try {
    return decodeURIComponent(url.pathname);
  } catch {
    return null;
  }
}

function hasTraversal(key: string) {
  return key.split("/").some((segment) => segment === "." || segment === ".." || segment === "");
}

function exactOrigin(value: string | undefined) {
  if (!value) return null;
  const url = parseUrl(value);
  return url?.protocol === "https:" ? url.origin : null;
}

function keyFromEndpointPath(env: HonoAppEnv["Bindings"], url: URL) {
  if (url.origin !== exactOrigin(env.R2_ENDPOINT)) return null;
  const decodedPath = decodeUrlPath(url);
  if (!decodedPath) return null;
  const bucketPrefix = `/${env.R2_BUCKET_NAME}/`;
  if (!decodedPath.startsWith(bucketPrefix)) return null;
  return decodedPath.slice(bucketPrefix.length);
}

function keyFromPublicPath(env: HonoAppEnv["Bindings"], url: URL) {
  const publicUrlValue = (env as HonoAppEnv["Bindings"] & { R2_PUBLIC_URL?: string }).R2_PUBLIC_URL;
  if (!publicUrlValue) return null;
  const publicUrl = parseUrl(publicUrlValue);
  if (!publicUrl || publicUrl.protocol !== "https:" || url.origin !== publicUrl.origin) return null;

  const decodedPath = decodeUrlPath(url);
  const decodedPublicPath = decodeUrlPath(publicUrl);
  if (decodedPath === null || decodedPublicPath === null) return null;
  const basePath = decodedPublicPath.replace(/\/$/, "");
  const prefix = `${basePath}/`;
  if (basePath && !decodedPath.startsWith(prefix)) return null;
  if (!basePath && !decodedPath.startsWith("/")) return null;
  return decodedPath.slice(basePath ? prefix.length : 1);
}

function parseOwnedStorageUrl(env: HonoAppEnv["Bindings"], userId: string, value: string) {
  const url = parseUrl(value);
  if (!url || url.protocol !== "https:" || url.username || url.password || url.hash) return null;

  const key = keyFromEndpointPath(env, url) ?? keyFromPublicPath(env, url);
  if (!key || hasTraversal(key)) return null;
  if (!key.startsWith(`uploads/${userId}/`) || key.length <= `uploads/${userId}/`.length) return null;

  return { key };
}

function objectContentType(object: R2Object | R2ObjectBody) {
  return object.httpMetadata?.contentType ?? object.customMetadata?.contentType ?? "";
}

function isWavContentType(value: string) {
  const contentType = value.trim().toLowerCase().split(";")[0];
  return contentType === "" || contentType === "audio/wav" || contentType === "audio/x-wav" || contentType === "audio/wave" || contentType === "audio/vnd.wave";
}

function hasWavExtension(key: string) {
  return /\.wav$/i.test(key.split("/").pop() ?? key);
}

async function verifyStorageObject(
  env: HonoAppEnv["Bindings"],
  ownedUrl: OwnedStorageUrl,
  declaredSize: number,
  options: { chunk: boolean },
) {
  const object = await env.R2.head(ownedUrl.key);
  if (!object) {
    return { ok: false as const, status: 404, code: "TRANSCRIPTION_SOURCE_NOT_FOUND", message: "Transcription source was not found. Please upload it again." };
  }
  if (object.size <= 0) {
    return { ok: false as const, status: 400, code: "INVALID_FILE_SIZE", message: "Transcription source is empty" };
  }
  if (object.size !== declaredSize) {
    return { ok: false as const, status: 400, code: "TRANSCRIPTION_SOURCE_SIZE_MISMATCH", message: "Transcription source size does not match the uploaded object" };
  }
  if (object.size > PROVIDER_COMPATIBLE_TRANSCRIPTION_SIZE_LIMIT_BYTES) {
    return { ok: false as const, status: 413, code: PROVIDER_SIZE_ERROR_CODE, message: PROVIDER_SIZE_ERROR_MESSAGE };
  }
  if (options.chunk && (!hasWavExtension(ownedUrl.key) || !isWavContentType(objectContentType(object)))) {
    return { ok: false as const, status: 415, code: "UNSUPPORTED_TRANSCRIPTION_CHUNK_FORMAT", message: "chunks must reference generated WAV audio objects" };
  }

  return { ok: true as const, size: object.size };
}

transcribeRoutes.post("/transcribe", async (c) => {
  const user = requireUser(c);
  if (!user) return fail(c, 401, "UNAUTHORIZED", "Authentication required");

  const body = await c.req.json<{
    filename?: string;
    audio_url?: string;
    duration_seconds?: number;
    file_size_bytes?: number;
    idempotency_key?: unknown;
    chunks?: unknown;
  }>();

  if (!body.audio_url || !parseUrl(body.audio_url)) {
    return fail(c, 400, "INVALID_AUDIO_URL", "audio_url must be a valid URL");
  }

  const durationSeconds = parseDurationSeconds(body.duration_seconds);
  if (durationSeconds === null) {
    return fail(c, 400, "INVALID_DURATION", "duration_seconds must be a positive number");
  }

  const fileSizeBytes = parseFileSizeBytes(body.file_size_bytes);
  if (fileSizeBytes === null) {
    return fail(c, 400, "INVALID_FILE_SIZE", "file_size_bytes must be a positive safe integer");
  }

  if (fileSizeBytes > APPLICATION_TRANSCRIPTION_SIZE_LIMIT_BYTES) {
    return fail(c, 413, APPLICATION_SIZE_ERROR_CODE, APPLICATION_SIZE_ERROR_MESSAGE);
  }

  const sourceUrl = parseOwnedStorageUrl(c.env, user.id, body.audio_url);
  if (!sourceUrl) {
    return fail(c, 400, "INVALID_AUDIO_URL", "audio_url must reference an owned uploaded object");
  }

  const chunkResult = parseTranscriptionChunks(body.chunks);
  if (!chunkResult.ok) {
    return fail(c, 400, "INVALID_TRANSCRIPTION_CHUNKS", "chunks must be 1 to 64 ordered audio URLs no larger than 25,000,000 bytes each");
  }

  const filename = body.filename?.trim() || "audio";
  const directSourceSupported = isGroqDirectSourceFormatSupported(sourceUrl.key);
  const chunkedSourceSupported = isGroqDirectSourceFormatSupported(filename);

  if (chunkResult.chunks && fileSizeBytes <= PROVIDER_COMPATIBLE_TRANSCRIPTION_SIZE_LIMIT_BYTES && chunkedSourceSupported) {
    return fail(c, 400, "UNEXPECTED_TRANSCRIPTION_CHUNKS", "chunks are only accepted for files over 25,000,000 bytes or unsupported source containers");
  }

  if (chunkResult.chunks && !chunkDurationMatchesSourceDuration(chunkResult.chunks, durationSeconds)) {
    return fail(c, 400, "INVALID_TRANSCRIPTION_CHUNK_DURATION", "chunk durations must match the source media duration");
  }

  if (fileSizeBytes > PROVIDER_COMPATIBLE_TRANSCRIPTION_SIZE_LIMIT_BYTES && !chunkResult.chunks) {
    return fail(c, 413, PROVIDER_SIZE_ERROR_CODE, PROVIDER_SIZE_ERROR_MESSAGE);
  }

  if (!directSourceSupported && !chunkResult.chunks) {
    return fail(c, 415, UNSUPPORTED_SOURCE_FORMAT_ERROR_CODE, UNSUPPORTED_SOURCE_FORMAT_ERROR_MESSAGE);
  }

  let verifiedChunks: VerifiedTranscriptionChunk[] | undefined;
  if (chunkResult.chunks) {
    if (body.audio_url !== chunkResult.chunks[0].audioUrl) {
      return fail(c, 400, "INVALID_AUDIO_URL", "audio_url must match the first chunk audio_url");
    }
    verifiedChunks = [];
    for (const chunk of chunkResult.chunks) {
      const chunkUrl = parseOwnedStorageUrl(c.env, user.id, chunk.audioUrl);
      if (!chunkUrl) {
        return fail(c, 400, "INVALID_AUDIO_URL", "chunk audio_url must reference an owned uploaded object");
      }
      const verified = await verifyStorageObject(c.env, chunkUrl, chunk.fileSizeBytes, { chunk: true });
      if (!verified.ok) return fail(c, verified.status, verified.code, verified.message);
      verifiedChunks.push({ ...chunk, key: chunkUrl.key });
    }
  } else {
    const verified = await verifyStorageObject(c.env, sourceUrl, fileSizeBytes, { chunk: false });
    if (!verified.ok) return fail(c, verified.status, verified.code, verified.message);
  }

  const plan = normalizePlan(user.plan ?? user.subscription_plan ?? user.subscription_tier ?? user.tier ?? user.vip_level);
  const quota = getPlanQuota(plan);
  if (durationSeconds > quota.maxFileMinutes * 60) {
    return fail(
      c,
      413,
      "FILE_DURATION_LIMIT",
      `${plan === "free" ? "Free" : plan === "pro" ? "Pro" : "Studio"} supports up to ${quota.maxFileMinutes} minutes per file`,
    );
  }

  const minutes = Math.ceil(durationSeconds / 60);
  const idempotencyKey = normalizeIdempotencyKey(body.idempotency_key);
  const id = idempotencyKey ? await idempotentJobId(user.id, idempotencyKey) : createId("job");
  if (idempotencyKey) {
    const existing = await c.env.DB.prepare("SELECT * FROM transcription_jobs WHERE id = ? AND user_id = ?")
      .bind(id, user.id)
      .first<TranscriptionJob>();
    if (existing) {
      return ok(c, { id: existing.id, job_id: existing.id, status: existing.status, minutes_charged: minutes }, 202);
    }
  }

  const now = nowIso();
  const charged = await consumeMinutes(c.env, user.id, minutes, `Transcription: ${filename}`, plan);
  if (!charged) return fail(c, 402, "INSUFFICIENT_CREDITS", "Usage limit exceeded");

  try {
    await c.env.DB.prepare(
      `INSERT INTO transcription_jobs
        (id, user_id, status, filename, audio_url, srt_content, duration_seconds, created_at, updated_at)
       VALUES (?, ?, 'queued', ?, ?, NULL, ?, ?, ?)`,
    )
      .bind(id, user.id, filename, body.audio_url, durationSeconds, now, now)
      .run();

    const message: TranscriptionQueueMessage = {
      jobId: id,
      userId: user.id,
      audioUrl: body.audio_url,
      filename,
      durationSeconds,
      fileSizeBytes,
      ...(verifiedChunks ? { chunks: verifiedChunks.map(({ audioUrl, durationSeconds, fileSizeBytes }) => ({ audioUrl, durationSeconds, fileSizeBytes })) } : {}),
      createdAt: now,
    };
    await c.env.AI_QUEUE.send(message);
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "Failed to queue transcription";
    try {
      await c.env.DB.prepare(
        `UPDATE transcription_jobs
         SET status = 'failed', srt_content = ?, updated_at = ?
         WHERE id = ? AND user_id = ?`,
      )
        .bind(messageText, nowIso(), id, user.id)
        .run();
    } catch (statusError) {
      console.error("[Transcription Queue Cleanup Error] job:", id, "error:", statusError);
    }

    await refundJobMinutes(c.env, {
      jobId: id,
      userId: user.id,
      durationSeconds,
      createdAt: now,
      description: `Refund failed transcription: ${filename}`,
    });

    return fail(c, 500, "TRANSCRIPTION_QUEUE_FAILED", "Failed to queue transcription");
  }

  return ok(c, { id, job_id: id, status: "queued", minutes_charged: minutes }, 202);
});

transcribeRoutes.get("/jobs/:id", async (c) => {
  const user = requireUser(c);
  if (!user) return fail(c, 401, "UNAUTHORIZED", "Authentication required");

  const job = await c.env.DB.prepare("SELECT * FROM transcription_jobs WHERE id = ? AND user_id = ?")
    .bind(c.req.param("id"), user.id)
    .first<TranscriptionJob>();

  if (!job) return fail(c, 404, "NOT_FOUND", "Job not found");
  return ok(c, job);
});
