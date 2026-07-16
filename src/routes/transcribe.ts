import { Hono } from "hono";
import { consumeMinutes, refundJobMinutes } from "../lib/credits";
import { parseDurationSeconds } from "../lib/duration";
import { createId, nowIso } from "../lib/env";
import { getPlanQuota, normalizePlan } from "../lib/plans";
import { fail, ok } from "../lib/response";
import { requireUser } from "../lib/session";
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

transcribeRoutes.post("/transcribe", async (c) => {
  const user = requireUser(c);
  if (!user) return fail(c, 401, "UNAUTHORIZED", "Authentication required");

  const body = await c.req.json<{
    filename?: string;
    audio_url?: string;
    duration_seconds?: number;
  }>();

  if (!body.audio_url || !canParseUrl(body.audio_url)) {
    return fail(c, 400, "INVALID_AUDIO_URL", "audio_url must be a valid URL");
  }

  const durationSeconds = parseDurationSeconds(body.duration_seconds);
  if (durationSeconds === null) {
    return fail(c, 400, "INVALID_DURATION", "duration_seconds must be a positive number");
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
  const id = createId("job");
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
