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
  parseFileSizeBytes,
  PROVIDER_COMPATIBLE_TRANSCRIPTION_SIZE_LIMIT_BYTES,
  PROVIDER_SIZE_ERROR_CODE,
  PROVIDER_SIZE_ERROR_MESSAGE,
} from "../lib/transcription-limits";
import type { HonoAppEnv, TranscriptionJob, TranscriptionQueueMessage } from "../types";

export const transcribeRoutes = new Hono<HonoAppEnv>();

function canParseUrl(value: string) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
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
  if (!Array.isArray(value) || value.length === 0 || value.length > 20) {
    return { ok: false as const };
  }

  const chunks: NonNullable<TranscriptionQueueMessage["chunks"]> = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return { ok: false as const };
    const candidate = item as { audio_url?: unknown; duration_seconds?: unknown; file_size_bytes?: unknown };
    if (typeof candidate.audio_url !== "string" || !canParseUrl(candidate.audio_url)) return { ok: false as const };
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

  if (!body.audio_url || !canParseUrl(body.audio_url)) {
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

  const chunkResult = parseTranscriptionChunks(body.chunks);
  if (!chunkResult.ok) {
    return fail(c, 400, "INVALID_TRANSCRIPTION_CHUNKS", "chunks must be ordered audio URLs no larger than 100,000,000 bytes each");
  }

  if (chunkResult.chunks && fileSizeBytes <= PROVIDER_COMPATIBLE_TRANSCRIPTION_SIZE_LIMIT_BYTES) {
    return fail(c, 400, "UNEXPECTED_TRANSCRIPTION_CHUNKS", "chunks are only accepted for files over 100,000,000 bytes");
  }

  if (chunkResult.chunks && !chunkDurationMatchesSourceDuration(chunkResult.chunks, durationSeconds)) {
    return fail(c, 400, "INVALID_TRANSCRIPTION_CHUNK_DURATION", "chunk durations must match the source media duration");
  }

  if (fileSizeBytes > PROVIDER_COMPATIBLE_TRANSCRIPTION_SIZE_LIMIT_BYTES && !chunkResult.chunks) {
    return fail(c, 413, PROVIDER_SIZE_ERROR_CODE, PROVIDER_SIZE_ERROR_MESSAGE);
  }

  const filename = body.filename?.trim() || "audio";
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
      ...(chunkResult.chunks ? { chunks: chunkResult.chunks } : {}),
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
