import { Hono } from "hono";
import { cors } from "hono/cors";
import { transcribeWithGroq } from "./lib/ai";
import { appOrigin, nowIso } from "./lib/env";
import { loadUser } from "./lib/session";
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

async function handleTranscription(message: TranscriptionQueueMessage, env: Bindings) {
  const now = nowIso();

  await env.DB.prepare(
    `UPDATE transcription_jobs
     SET status = 'processing', updated_at = ?
     WHERE id = ? AND user_id = ?`,
  )
    .bind(now, message.jobId, message.userId)
    .run();

  try {
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
    await env.DB.prepare(
      `UPDATE transcription_jobs
       SET status = 'failed', srt_content = ?, updated_at = ?
       WHERE id = ? AND user_id = ?`,
    )
      .bind(messageText, nowIso(), message.jobId, message.userId)
      .run();

    throw new Error(messageText);
  }
}

export default {
  fetch: app.fetch,

  async queue(batch, env) {
    for (const message of batch.messages) {
      try {
        await handleTranscription(message.body, env);
        message.ack();
      } catch (err) {
        console.error("[Queue Error] job:", message.id, "error:", err);
        message.retry();
      }
    }
  },
} satisfies ExportedHandler<Bindings, TranscriptionQueueMessage>;
