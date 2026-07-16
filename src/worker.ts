import { Hono } from "hono";
import { cors } from "hono/cors";
import { transcribeWithGroq } from "./lib/ai";
import { refundJobMinutes } from "./lib/credits";
import { appOrigin, nowIso } from "./lib/env";
import { shouldCallTranscriptionProvider } from "./lib/queue";
import { deleteExpiredUploads } from "./lib/retention";
import { bootstrapSchema } from "./lib/schema";
import { loadUser } from "./lib/session";
import { adminRoutes } from "./routes/admin";
import { authRoutes } from "./routes/auth";
import { checkoutRoutes } from "./routes/checkout";
import { healthRoutes } from "./routes/health";
import { transcribeRoutes } from "./routes/transcribe";
import { uploadRoutes } from "./routes/upload";
import { usageRoutes } from "./routes/usage";
import { webhookRoutes } from "./routes/webhooks";
import type { Bindings, HonoAppEnv, TranscriptionQueueMessage } from "./types";

const app = new Hono<HonoAppEnv>();

app.use(
  "/api/*",
  cors({
    origin: (origin, c) => origin || appOrigin(c.env),
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization", "creem-signature"],
    allowMethods: ["GET", "POST", "OPTIONS"],
  }),
);

app.use("/api/*", loadUser);

app.route("/api", healthRoutes);
app.route("/api", authRoutes);
app.route("/api", adminRoutes);
app.route("/api", usageRoutes);
app.route("/api", uploadRoutes);
app.route("/api", transcribeRoutes);
app.route("/api", checkoutRoutes);
app.route("/api", webhookRoutes);

app.notFound(async (c) => {
  if (c.req.method === "GET") {
    return c.env.ASSETS.fetch(c.req.raw);
  }

  return c.json({ ok: false, error: { code: "NOT_FOUND", message: "Route not found" } }, 404);
});

type StoredTranscriptionJob = {
  user_id: string;
  filename: string;
  status: "queued" | "processing" | "completed" | "failed";
  duration_seconds: number;
  created_at: string;
};

async function getStoredJob(env: Bindings, jobId: string) {
  return env.DB.prepare(
    `SELECT user_id, filename, status, duration_seconds, created_at
     FROM transcription_jobs
     WHERE id = ?`,
  )
    .bind(jobId)
    .first<StoredTranscriptionJob>();
}

async function refundStoredJobCharge(env: Bindings, jobId: string, fallback: TranscriptionQueueMessage, storedJob?: StoredTranscriptionJob | null) {
  const job = storedJob ?? await getStoredJob(env, jobId);

  await refundJobMinutes(env, {
    jobId,
    userId: job?.user_id ?? fallback.userId,
    durationSeconds: job?.duration_seconds ?? fallback.durationSeconds,
    createdAt: job?.created_at ?? fallback.createdAt ?? nowIso(),
    description: `Refund failed transcription: ${job?.filename ?? fallback.filename}`,
  });
}

async function finalizeFailedTranscription(env: Bindings, message: TranscriptionQueueMessage, reason: string) {
  const job = await getStoredJob(env, message.jobId);
  if (job?.status === "completed") return;

  await env.DB.prepare(
    `UPDATE transcription_jobs
     SET status = 'failed', srt_content = ?, updated_at = ?
     WHERE id = ? AND user_id = ? AND status != 'completed'`,
  )
    .bind(reason, nowIso(), message.jobId, message.userId)
    .run();

  await refundStoredJobCharge(env, message.jobId, message, job);
}

async function handleTranscription(message: TranscriptionQueueMessage, env: Bindings, callProvider: boolean) {
  const storedJob = await getStoredJob(env, message.jobId);
  if (storedJob?.status === "completed") return;
  if (storedJob?.status === "failed") {
    await refundStoredJobCharge(env, message.jobId, message, storedJob);
    return;
  }

  if (!callProvider) {
    await finalizeFailedTranscription(env, message, "Transcription failed after 3 provider attempts");
    return;
  }

  const now = nowIso();

  try {
    await env.DB.prepare(
      `UPDATE transcription_jobs
       SET status = 'processing', updated_at = ?
       WHERE id = ? AND user_id = ? AND status != 'completed'`,
    )
      .bind(now, message.jobId, message.userId)
      .run();

    const srt = await transcribeWithGroq(env, message.audioUrl, message.filename);
    await env.DB.prepare(
      `UPDATE transcription_jobs
       SET status = 'completed', srt_content = ?, updated_at = ?
       WHERE id = ? AND user_id = ?`,
    )
      .bind(srt, nowIso(), message.jobId, message.userId)
      .run();
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "Transcription failed";
    console.error("[Transcription Error] job:", message.jobId, "error:", messageText, "stack:", error instanceof Error ? error.stack : "");
    throw new Error(messageText);
  }
}

export default {
  async fetch(request, env, ctx) {
    await bootstrapSchema(env);
    return app.fetch(request, env, ctx);
  },

  async queue(batch, env) {
    await bootstrapSchema(env);

    for (const message of batch.messages) {
      const callProvider = shouldCallTranscriptionProvider(message.attempts);
      try {
        await handleTranscription(message.body, env, callProvider);
        message.ack();
      } catch (err) {
        console.error("[Queue Error] job:", message.id, "error:", err);
        message.retry();
      }
    }
  },

  async scheduled(_event, env) {
    await bootstrapSchema(env);
    const result = await deleteExpiredUploads(env.R2);
    console.log("[R2 Retention]", JSON.stringify(result));
  },
} satisfies ExportedHandler<Bindings, TranscriptionQueueMessage>;
