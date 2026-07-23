import { getCloudflareContext } from "@opennextjs/cloudflare";
import { jsonResponse } from "@/lib/paypal";

type EventEnv = CloudflareEnv & {
  DB?: D1DatabaseLike;
};

type WaitUntilContext = {
  waitUntil?(promise: Promise<unknown>): void;
};

type D1DatabaseLike = {
  prepare(query: string): D1PreparedStatementLike;
};

type D1PreparedStatementLike = {
  bind(...values: unknown[]): D1PreparedStatementLike;
  first<T = unknown>(): Promise<T | null>;
  run(): Promise<unknown>;
};

const allowedEvents = new Set([
  "landing_page_view",
  "upload_clicked",
  "file_selected",
  "file_rejected",
  "sign_in_started",
  "sign_in_completed",
  "transcription_started",
  "transcription_completed",
  "transcription_failed",
  "editor_opened",
  "export_started",
  "download_initiated",
  "pricing_viewed",
  "checkout_intent",
  "checkout_started",
  "checkout_completed",
  "checkout_failed"
]);

const allowedProperties = new Set([
  "billing",
  "credits",
  "durationSeconds",
  "errorType",
  "fileSize",
  "fileType",
  "format",
  "hasRows",
  "plan",
  "reason",
  "rowCount",
  "source",
  "status"
]);

const allowedPaths = new Set([
  "/",
  "/audio-to-srt",
  "/audio-to-text",
  "/auth/complete",
  "/course-captions",
  "/editor",
  "/faq",
  "/mp4-to-srt",
  "/podcast-transcription",
  "/pricing",
  "/srt-editor",
  "/tools",
  "/video-to-srt",
  "/video-to-text",
  "/video-to-vtt"
]);

const allowedStringProperties: Record<string, Set<string>> = {
  billing: new Set(["monthly", "yearly"]),
  credits: new Set(["2h", "5h", "20h"]),
  errorType: new Set(["auth", "browser_decode_failed", "empty_result", "job_failed", "missing_job_id", "missing_upload_url", "provider", "quota", "request", "technical_size_guard", "timeout"]),
  fileType: new Set(["audio", "video", "unknown"]),
  format: new Set(["srt", "txt", "vtt"]),
  plan: new Set(["free", "pro", "studio"]),
  reason: new Set(["browser_decode_failed", "duration_plan_limit", "technical_size_guard"]),
  source: new Set([
    "editor",
    "editor_poll",
    "editor_transcribe",
    "editor_transcription",
    "export_modal",
    "home_upload",
    "login_modal",
    "oauth_complete",
    "paypal_credits",
    "paypal_credits_capture",
    "paypal_subscription",
    "paypal_subscription_sync",
    "pricing",
    "pricing_checkout",
    "pricing_credits",
    "pricing_credits_start",
    "pricing_start"
  ]),
  status: new Set(["cancelled", "completed", "failed", "started"])
};

type EventPayload = {
  anonymousId?: string;
  event?: string;
  path?: string;
  properties?: Record<string, unknown>;
};

let eventsSchemaReadyPromise: Promise<boolean> | null = null;

async function initializeEventsSchema(env: EventEnv) {
  if (!env.DB) {
    return false;
  }

  await env.DB
    .prepare(
      `CREATE TABLE IF NOT EXISTS conversion_events (
        id TEXT PRIMARY KEY,
        event_name TEXT NOT NULL,
        anonymous_id TEXT NOT NULL,
        path TEXT NOT NULL,
        referrer_host TEXT,
        properties_json TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`
    )
    .run();

  await env.DB
    .prepare("CREATE INDEX IF NOT EXISTS idx_conversion_events_created_at ON conversion_events (created_at)")
    .run();

  await env.DB
    .prepare("CREATE INDEX IF NOT EXISTS idx_conversion_events_event_created ON conversion_events (event_name, created_at)")
    .run();

  await env.DB
    .prepare("CREATE INDEX IF NOT EXISTS idx_conversion_events_anonymous_created ON conversion_events (anonymous_id, created_at)")
    .run();

  await env.DB
    .prepare(
      `CREATE TABLE IF NOT EXISTS conversion_event_daily (
        event_date TEXT NOT NULL,
        event_name TEXT NOT NULL,
        count INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (event_date, event_name)
      )`
    )
    .run();

  await env.DB
    .prepare(
      `CREATE TABLE IF NOT EXISTS conversion_event_rate (
        event_minute TEXT NOT NULL,
        rate_key TEXT NOT NULL,
        count INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (event_minute, rate_key)
      )`
    )
    .run();

  await env.DB
    .prepare("CREATE INDEX IF NOT EXISTS idx_conversion_event_rate_updated ON conversion_event_rate (updated_at)")
    .run();

  return true;
}

async function ensureEventsSchema(env: EventEnv) {
  if (!env.DB) {
    return false;
  }

  eventsSchemaReadyPromise ??= initializeEventsSchema(env).catch((error) => {
    eventsSchemaReadyPromise = null;
    throw error;
  });

  return eventsSchemaReadyPromise;
}

function cleanPath(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/") || value.length > 160) {
    return "/";
  }

  const path = value.split(/[?#]/)[0] || "/";
  return allowedPaths.has(path) ? path : "/";
}

function cleanAnonymousId(value: unknown) {
  return typeof value === "string" && /^[a-f0-9-]{16,64}$/i.test(value) ? value : crypto.randomUUID();
}

function cleanProperties(properties: unknown) {
  const clean: Record<string, boolean | number | string | null> = {};

  if (!properties || typeof properties !== "object" || Array.isArray(properties)) {
    return clean;
  }

  for (const [key, value] of Object.entries(properties as Record<string, unknown>)) {
    if (!allowedProperties.has(key)) {
      continue;
    }

    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (allowedStringProperties[key]?.has(normalized)) {
        clean[key] = normalized;
      }
    } else if (typeof value === "number" && Number.isFinite(value)) {
      if (key === "durationSeconds") {
        clean[key] = Math.max(0, Math.min(24 * 60 * 60, Math.round(value)));
      }
      if (key === "fileSize") {
        clean[key] = Math.max(0, Math.min(25 * 1024 * 1024 * 1024, Math.round(value)));
      }
      if (key === "rowCount") {
        clean[key] = Math.max(0, Math.min(10000, Math.round(value)));
      }
    } else if ((key === "hasRows" && typeof value === "boolean") || value === null) {
      clean[key] = value;
    }
  }

  return clean;
}

function getReferrerHost(request: Request) {
  const referrer = request.headers.get("referer");
  if (!referrer) {
    return null;
  }

  try {
    return new URL(referrer).host.slice(0, 120);
  } catch {
    return null;
  }
}

function isSameOriginRequest(request: Request) {
  const requestOrigin = new URL(request.url).origin;
  const origin = request.headers.get("origin");
  if (origin) {
    return origin === requestOrigin;
  }

  const referrer = request.headers.get("referer");
  if (!referrer) {
    return false;
  }

  try {
    return new URL(referrer).origin === requestOrigin;
  } catch {
    return false;
  }
}

function getHeaderValue(request: Request, parts: string[]) {
  return request.headers.get(parts.join("-"));
}

async function sha256Hex(value: string) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function readBoundedJson<T>(request: Request, maxBytes: number): Promise<{ payload: T | null; tooLarge: boolean }> {
  const reader = request.body?.getReader();
  if (!reader) {
    return { payload: null, tooLarge: false };
  }

  const chunks: Uint8Array[] = [];
  let receivedBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    receivedBytes += value.byteLength;
    if (receivedBytes > maxBytes) {
      await reader.cancel();
      return { payload: null, tooLarge: true };
    }
    chunks.push(value);
  }

  try {
    const body = new Uint8Array(receivedBytes);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const text = new TextDecoder().decode(body);
    return { payload: JSON.parse(text) as T, tooLarge: false };
  } catch {
    return { payload: null, tooLarge: false };
  }
}

async function createRateLimitKey(request: Request, eventDate: string) {
  const cf = (request as Request & { cf?: Record<string, unknown> }).cf ?? {};
  const clientAddress =
    getHeaderValue(request, ["cf", "connecting", "ip"]) ??
    getHeaderValue(request, ["x", "real", "ip"]) ??
    getHeaderValue(request, ["x", "forwarded", "for"])?.split(",")[0]?.trim() ??
    "";
  const fallback = [
    String(cf.colo ?? ""),
    String(cf.country ?? ""),
    String(cf.asn ?? ""),
    request.headers.get("user-agent")?.slice(0, 160) ?? "",
    request.headers.get("accept-language")?.slice(0, 80) ?? ""
  ].join("|");

  return sha256Hex(`conversion-rate-v1|${eventDate}|${clientAddress || fallback}`);
}

async function checkAndIncrementRateLimit(env: EventEnv, rateKey: string, now = new Date()) {
  const eventMinute = now.toISOString().slice(0, 16);
  const row = await env.DB!.prepare("SELECT count FROM conversion_event_rate WHERE event_minute = ? AND rate_key = ?")
    .bind(eventMinute, rateKey)
    .first<{ count: number }>();

  if ((row?.count ?? 0) >= 60) {
    return false;
  }

  await env.DB!.prepare(
    `INSERT INTO conversion_event_rate (event_minute, rate_key, count)
     VALUES (?, ?, 1)
     ON CONFLICT(event_minute, rate_key) DO UPDATE SET count = count + 1, updated_at = CURRENT_TIMESTAMP`
  )
    .bind(eventMinute, rateKey)
    .run();

  return true;
}

function scheduleAnalyticsCleanup(env: EventEnv, ctx: WaitUntilContext | undefined) {
  if (!env.DB) {
    return;
  }

  const cleanup = Promise.all([
    env.DB.prepare("DELETE FROM conversion_events WHERE created_at < datetime('now', '-30 days')").run(),
    env.DB.prepare("DELETE FROM conversion_event_rate WHERE event_minute < strftime('%Y-%m-%dT%H:%M', 'now', '-2 hours')").run()
  ]).catch(() => undefined);

  if (ctx?.waitUntil) {
    ctx.waitUntil(cleanup);
  } else {
    void cleanup;
  }
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return jsonResponse({ ok: true, stored: false }, { status: 403 });
  }

  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > 4096) {
    return jsonResponse({ message: "Event payload is too large." }, { status: 413 });
  }

  const { payload, tooLarge } = await readBoundedJson<EventPayload>(request, 4096);
  if (tooLarge) {
    return jsonResponse({ message: "Event payload is too large." }, { status: 413 });
  }

  if (!payload?.event || !allowedEvents.has(payload.event)) {
    return jsonResponse({ message: "Unknown event." }, { status: 400 });
  }

  const context = await getCloudflareContext({ async: true });
  const env = context.env as EventEnv;
  try {
    const hasDb = await ensureEventsSchema(env);
    if (!hasDb || !env.DB) {
      return jsonResponse({ ok: true, stored: false });
    }

    const eventId = crypto.randomUUID();
    const anonymousId = cleanAnonymousId(payload.anonymousId);
    const eventDate = new Date().toISOString().slice(0, 10);
    const rateKey = await createRateLimitKey(request, eventDate);
    const underLimit = await checkAndIncrementRateLimit(env, rateKey);

    if (!underLimit) {
      return jsonResponse({ message: "Too many events." }, { status: 429 });
    }

    await env.DB
      .prepare(
        `INSERT INTO conversion_events (id, event_name, anonymous_id, path, referrer_host, properties_json)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(eventId, payload.event, anonymousId, cleanPath(payload.path), getReferrerHost(request), JSON.stringify(cleanProperties(payload.properties)))
      .run();

    await env.DB
      .prepare(
        `INSERT INTO conversion_event_daily (event_date, event_name, count)
         VALUES (?, ?, 1)
         ON CONFLICT(event_date, event_name) DO UPDATE SET count = count + 1`
      )
      .bind(eventDate, payload.event)
      .run();

    scheduleAnalyticsCleanup(env, context.ctx);

    return jsonResponse({ ok: true, stored: true });
  } catch {
    return jsonResponse({ ok: true, stored: false });
  }
}
