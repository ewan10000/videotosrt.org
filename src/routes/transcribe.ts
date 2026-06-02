import { Hono } from "hono";
import { consumeMinutes } from "../lib/credits";
import { createId, nowIso } from "../lib/env";
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

  const durationSeconds = Math.max(1, Math.ceil(Number(body.duration_seconds ?? 0)));
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return fail(c, 400, "INVALID_DURATION", "duration_seconds must be a positive number");
  }

  const filename = body.filename?.trim() || "audio";
  const minutes = Math.ceil(durationSeconds / 60);
  const charged = await consumeMinutes(c.env, user.id, minutes, `Transcription: ${filename}`);
  if (!charged) return fail(c, 402, "INSUFFICIENT_CREDITS", "Usage limit exceeded");

  const id = createId("job");
  const now = nowIso();
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
  };
  await c.env.AI_QUEUE.send(message);

  return ok(c, { id, status: "queued", minutes_charged: minutes }, 202);
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
