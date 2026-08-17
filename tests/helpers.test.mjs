import assert from "node:assert/strict";

const plans = await import("../dist/lib/plans.js");
const retention = await import("../dist/lib/retention.js");
const duration = await import("../dist/lib/duration.js");
const refund = await import("../dist/lib/refund.js");
const queue = await import("../dist/lib/queue.js");
const limits = await import("../dist/lib/transcription-limits.js");
const ai = await import("../dist/lib/ai.js");
const schema = await import("../dist/lib/schema.js");
const crawler = await import("../dist/lib/crawler.js");
const session = await import("../dist/lib/session.js");
const worker = await import("../dist/worker.js?request-tests");

assert.equal(plans.getPlanQuota("free").monthlyMinutes, 60);
assert.equal(plans.getPlanQuota("pro").monthlyMinutes, 600);
assert.equal(plans.getPlanQuota("studio").monthlyMinutes, 3000);
assert.equal(plans.getMaxFileDurationSeconds("pro"), 180 * 60);
assert.equal(plans.isWithinFileDurationLimit(181 * 60, "pro"), false);
assert.equal(plans.normalizePlan("business"), "studio");
assert.equal(plans.normalizePlan("team"), "studio");
assert.equal(plans.normalizePlan("monthly"), "free");
assert.equal(plans.normalizePlan("yearly"), "free");

assert.equal(duration.parseDurationSeconds(0), null);
assert.equal(duration.parseDurationSeconds(-1), null);
assert.equal(duration.parseDurationSeconds(Number.NaN), null);
assert.equal(duration.parseDurationSeconds(Number.POSITIVE_INFINITY), null);
assert.equal(duration.parseDurationSeconds(undefined), null);
assert.equal(duration.parseDurationSeconds(0.2), 1);
assert.equal(duration.parseDurationSeconds(61.1), 62);

assert.equal(refund.usageMonthFromCreatedAt("2026-06-30T23:59:59.000Z"), "2026-06");
assert.equal(refund.usageMonthFromCreatedAt("2026-07-01T00:00:00.000+08:00"), "2026-06");
assert.equal(refund.usageMonthFromCreatedAt("2026-12-not-a-real-date"), "2026-12");
assert.equal(refund.usageMonthFromCreatedAt("not-a-date", new Date("2026-08-01T00:00:00.000Z")), "2026-08");
assert.equal(refund.refundTransactionId("job_1"), "refund_job_1");
assert.equal(refund.refundTransactionId("job_1"), refund.refundTransactionId("job_1"));
assert.notEqual(refund.refundTransactionId("job_1"), refund.refundTransactionId("job_2"));
assert.equal(queue.MAX_PROVIDER_ATTEMPTS, 3);
assert.equal(queue.shouldCallTranscriptionProvider(1), true);
assert.equal(queue.shouldCallTranscriptionProvider(3), true);
assert.equal(queue.shouldCallTranscriptionProvider(4), false);
assert.equal(limits.APPLICATION_TRANSCRIPTION_SIZE_LIMIT_BYTES, 300000000);
assert.equal(limits.PROVIDER_COMPATIBLE_TRANSCRIPTION_SIZE_LIMIT_BYTES, 100000000);
assert.equal(limits.GROQ_MULTIPART_ATTACHMENT_SIZE_LIMIT_BYTES, 25000000);
assert.equal(crawler.X_ROBOTS_TAG, "noindex,nofollow");
assert.equal(crawler.robotsTxt(), "User-agent: *\nAllow: /\n");

const searchableResponse = new Response("{}", {
  headers: {
    "content-type": "application/json",
    "cache-control": "no-store",
  },
});
const noindexResponse = crawler.withNoindexHeaders(searchableResponse);
assert.equal(noindexResponse.headers.get("x-robots-tag"), "noindex,nofollow");
assert.equal(noindexResponse.headers.get("content-type"), "application/json");
assert.equal(noindexResponse.headers.get("cache-control"), "no-store");

assert.deepEqual(
  schema.missingUserColumnAlterStatements([
    { name: "id" },
    { name: "email" },
    { name: "plan" },
    { name: "extra_credit_hours" },
    { name: "last_login_at" },
  ]),
  [],
);
assert.deepEqual(schema.missingUserColumnAlterStatements([{ name: "id" }, { name: "email" }]), [
  "ALTER TABLE users ADD COLUMN plan TEXT NOT NULL DEFAULT 'free'",
  "ALTER TABLE users ADD COLUMN extra_credit_hours REAL NOT NULL DEFAULT 0",
  "ALTER TABLE users ADD COLUMN last_login_at TEXT",
]);
assert.deepEqual(schema.missingUserColumnAlterStatements([{ name: "plan" }, { name: "last_login_at" }]), [
  "ALTER TABLE users ADD COLUMN extra_credit_hours REAL NOT NULL DEFAULT 0",
]);

const bootstrapStatements = [];
let failNextBootstrap = true;
let failNextExtraCreditAlter = true;
let fakeUserColumns = [{ name: "id" }, { name: "email" }, { name: "plan" }];
const fakeEnv = {
  DB: {
    prepare(sql) {
      return {
        run: async () => {
          bootstrapStatements.push(sql);
          if (failNextBootstrap) {
            failNextBootstrap = false;
            throw new Error("temporary D1 failure");
          }
          if (sql === "ALTER TABLE users ADD COLUMN extra_credit_hours REAL NOT NULL DEFAULT 0" && failNextExtraCreditAlter) {
            failNextExtraCreditAlter = false;
            fakeUserColumns = [...fakeUserColumns, { name: "extra_credit_hours" }];
            throw new Error("duplicate column name: extra_credit_hours");
          }
          return {};
        },
        all: async () => {
          bootstrapStatements.push(sql);
          return { results: fakeUserColumns };
        },
      };
    },
  },
};
await assert.rejects(() => schema.bootstrapSchema(fakeEnv), /temporary D1 failure/);
await schema.bootstrapSchema(fakeEnv);
assert.deepEqual(bootstrapStatements, [
  `CREATE TABLE IF NOT EXISTS creem_events (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      processed_at TEXT,
      created_at TEXT NOT NULL
    )`,
  `CREATE TABLE IF NOT EXISTS creem_events (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      processed_at TEXT,
      created_at TEXT NOT NULL
    )`,
  "PRAGMA table_info(users)",
  "ALTER TABLE users ADD COLUMN extra_credit_hours REAL NOT NULL DEFAULT 0",
  "PRAGMA table_info(users)",
  "ALTER TABLE users ADD COLUMN last_login_at TEXT",
]);
await schema.bootstrapSchema({
  DB: {
    prepare() {
      throw new Error("cached bootstrap should not touch D1 again");
    },
  },
});

const uncachedSchema = await import("../dist/lib/schema.js?alter-rethrow");
const failedRaceStatements = [];
await assert.rejects(
  () => uncachedSchema.bootstrapSchema({
    DB: {
      prepare(sql) {
        return {
          run: async () => {
            failedRaceStatements.push(sql);
            if (sql === "ALTER TABLE users ADD COLUMN plan TEXT NOT NULL DEFAULT 'free'") {
              throw new Error("D1 alter failed");
            }
            return {};
          },
          all: async () => {
            failedRaceStatements.push(sql);
            return { results: [{ name: "id" }, { name: "email" }] };
          },
        };
      },
    },
  }),
  /D1 alter failed/,
);
assert.deepEqual(failedRaceStatements, [
  `CREATE TABLE IF NOT EXISTS creem_events (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      processed_at TEXT,
      created_at TEXT NOT NULL
    )`,
  "PRAGMA table_info(users)",
  "ALTER TABLE users ADD COLUMN plan TEXT NOT NULL DEFAULT 'free'",
  "PRAGMA table_info(users)",
]);

function createRequestTestEnv(options = {}) {
  const queries = [];
  const users = [...(options.users ?? [])];
  const jobs = [];
  const queueMessages = [];
  const creditTransactions = [];
  const usage = new Map();
  return {
    SITE_NAME: "VideoToSRT",
    APP_ORIGIN: "https://videotosrt.org",
    SESSION_SECRET: "test-secret",
    GOOGLE_CLIENT_ID: "google-client",
    GOOGLE_CLIENT_SECRET: "google-secret",
    GOOGLE_REDIRECT_URI: "https://api.videotosrt.org/api/auth/callback/google",
    SHIPANY_BRIDGE_SECRET: "shipany-secret",
    DB: {
      batch: async (statements) => {
        const results = [];
        for (const statement of statements) {
          results.push(await statement.run());
        }
        return results;
      },
      prepare(sql) {
        let bindings = [];
        queries.push(sql);
        return {
          bind(...values) {
            bindings = values;
            return this;
          },
          run: async () => {
            if (sql.startsWith("INSERT OR IGNORE INTO usage_records")) {
              const key = `${bindings[1]}:${bindings[2]}`;
              if (!usage.has(key)) {
                usage.set(key, {
                  userId: bindings[1],
                  month: bindings[2],
                  minutesUsed: bindings[3] ?? 0,
                  minutesLimit: bindings[4] ?? 0,
                });
              }
              return { meta: { changes: 1 } };
            }
            if (sql.startsWith("UPDATE usage_records")) {
              const key = `${bindings[2]}:${bindings[3]}`;
              const record = usage.get(key) ?? { userId: bindings[2], month: bindings[3], minutesUsed: 0, minutesLimit: 60 };
              if (sql.includes("MAX(minutes_used -")) {
                record.minutesUsed = Math.max(record.minutesUsed - bindings[0], 0);
                usage.set(key, record);
                return { meta: { changes: 1 } };
              }
              if (sql.includes("minutes_used = minutes_used +")) {
                const minutes = bindings[0];
                if (record.minutesUsed + minutes > record.minutesLimit) {
                  return { meta: { changes: 0 } };
                }
                record.minutesUsed += minutes;
                usage.set(key, record);
                return { meta: { changes: 1 } };
              }
              record.minutesLimit = Math.max(record.minutesLimit, bindings[0]);
              usage.set(key, record);
              return { meta: { changes: 1 } };
            }
            if (sql.startsWith("INSERT OR IGNORE INTO credit_transactions")) {
              if (creditTransactions.some((entry) => entry.id === bindings[0])) {
                return { meta: { changes: 0 } };
              }
              creditTransactions.push({ id: bindings[0], userId: bindings[1], amount: bindings[2], description: bindings[3] });
              return { meta: { changes: 1 } };
            }
            if (sql.startsWith("INSERT INTO credit_transactions")) {
              creditTransactions.push({ id: bindings[0], userId: bindings[1], amount: bindings[2], description: bindings[3] });
              return { meta: { changes: 1 } };
            }
            if (sql.startsWith("INSERT INTO transcription_jobs")) {
              jobs.push({
                id: bindings[0],
                user_id: bindings[1],
                status: "queued",
                filename: bindings[2],
                audio_url: bindings[3],
                duration_seconds: bindings[4],
                created_at: bindings[5],
                updated_at: bindings[6],
              });
              return { meta: { changes: 1 } };
            }
            if (sql.startsWith("UPDATE transcription_jobs")) {
              const jobIdBinding = sql.includes("status = 'processing'") ? bindings[1] : bindings[2];
              const userIdBinding = sql.includes("status = 'processing'") ? bindings[2] : bindings[3];
              const job = jobs.find((entry) => entry.id === jobIdBinding && entry.user_id === userIdBinding);
              if (job) {
                if (sql.includes("status = 'processing'")) {
                  job.status = "processing";
                  job.updated_at = bindings[0];
                } else if (sql.includes("status = 'completed'")) {
                  job.status = "completed";
                  job.srt_content = bindings[0];
                  job.updated_at = bindings[1];
                } else {
                  job.status = "failed";
                  job.srt_content = bindings[0];
                  job.updated_at = bindings[1];
                }
              }
              return { meta: { changes: job ? 1 : 0 } };
            }
            if (sql.startsWith("INSERT INTO users")) {
              users.push({
                id: bindings[0],
                email: bindings[1],
                name: bindings[2],
                avatar: bindings[3],
                provider: bindings[4],
                provider_id: bindings[5],
                plan: "free",
                created_at: bindings[6],
                updated_at: bindings[7],
              });
            }
            if (sql.startsWith("UPDATE users")) {
              const user = users.find((entry) => entry.id === bindings[4]);
              if (user) {
                user.email = bindings[0];
                user.name = bindings[1];
                user.avatar = bindings[2];
                user.updated_at = bindings[3];
              }
            }
            return {};
          },
          all: async () => ({ results: [{ name: "plan" }, { name: "extra_credit_hours" }, { name: "last_login_at" }] }),
          first: async () => {
            if (options.failSessionLookup) throw new Error("session lookup failed");
            if (sql === "SELECT * FROM users WHERE provider = ? AND provider_id = ?") {
              return users.find((entry) => entry.provider === bindings[0] && entry.provider_id === bindings[1]) ?? null;
            }
            if (sql === "SELECT * FROM users WHERE id = ?") {
              return users.find((entry) => entry.id === bindings[0]) ?? null;
            }
            if (sql.includes("FROM transcription_jobs") && sql.includes("WHERE id = ?")) {
              return jobs.find((entry) => entry.id === bindings[0]) ?? null;
            }
            return null;
          },
        };
      },
    },
    AI_QUEUE: {
      async send(message) {
        queueMessages.push(message);
      },
    },
    ASSETS: {
      fetch: async (request) => new Response(`asset:${new URL(request.url).pathname}`, {
        headers: { "content-type": "text/html; charset=utf-8" },
      }),
    },
    __queries: queries,
    __jobs: jobs,
    __queueMessages: queueMessages,
    __creditTransactions: creditTransactions,
    __usage: usage,
    R2_ACCOUNT_ID: "test-account",
    R2_BUCKET_NAME: "test-bucket",
    R2_ENDPOINT: "https://test-account.r2.cloudflarestorage.com",
    R2_ACCESS_KEY_ID: "test-access-key",
    R2_SECRET_ACCESS_KEY: "test-secret-key",
    R2: {
      put: async () => ({})
    },
    __users: users,
  };
}

async function fetchWorker(path, init = {}, env = createRequestTestEnv()) {
  const request = new Request(`https://api.example.test${path}`, init);
  return worker.default.fetch(request, env, {});
}

const robotsResponse = await fetchWorker("/robots.txt");
assert.equal(robotsResponse.status, 200);
assert.equal(robotsResponse.headers.get("x-robots-tag"), "noindex,nofollow");
assert.equal(await robotsResponse.text(), "User-agent: *\nAllow: /\n");
assert.equal(robotsResponse.headers.get("content-type"), "text/plain; charset=utf-8");

const healthResponse = await fetchWorker("/api/health");
assert.equal(healthResponse.status, 200);
assert.equal(healthResponse.headers.get("x-robots-tag"), "noindex,nofollow");
assert.match(healthResponse.headers.get("content-type") ?? "", /^application\/json/);
assert.equal((await healthResponse.json()).data.status, "healthy");

const optionsResponse = await fetchWorker("/api/health", {
  method: "OPTIONS",
  headers: {
    Origin: "https://client.example",
    "Access-Control-Request-Method": "GET",
  },
});
assert.equal(optionsResponse.status, 204);
assert.equal(optionsResponse.headers.get("x-robots-tag"), "noindex,nofollow");
assert.equal(optionsResponse.headers.get("access-control-allow-origin"), "https://client.example");
assert.equal(optionsResponse.headers.get("access-control-allow-credentials"), "true");

const api404Response = await fetchWorker("/api/missing", { method: "POST" });
assert.equal(api404Response.status, 404);
assert.equal(api404Response.headers.get("x-robots-tag"), "noindex,nofollow");
assert.equal((await api404Response.json()).error.code, "NOT_FOUND");

const sessionToken = await session.createSignedToken({ userId: "user_test", exp: Math.floor(Date.now() / 1000) + 60 }, "test-secret");
const errorResponse = await fetchWorker("/api/health", {
  headers: { Cookie: `vts_session=${sessionToken}` },
}, createRequestTestEnv({ failSessionLookup: true }));
assert.equal(errorResponse.status, 500);
assert.equal(errorResponse.headers.get("x-robots-tag"), "noindex,nofollow");
assert.equal((await errorResponse.json()).error.code, "INTERNAL_ERROR");

const oauthEnv = createRequestTestEnv();
const oauthState = await session.createStateToken(oauthEnv, {
  provider: "google",
  returnTo: "https://videotosrt.org/auth/complete?next=%2Fdashboard&source=google",
});
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = new URL(typeof input === "string" ? input : input.url);
  if (url.href === "https://oauth2.googleapis.com/token") {
    return Response.json({ access_token: "google-access-token" });
  }
  if (url.href === "https://www.googleapis.com/oauth2/v2/userinfo") {
    assert.equal(init?.headers?.Authorization, "Bearer google-access-token");
    return Response.json({
      id: "google-user-1",
      email: "User@Example.test",
      name: "Test User",
      picture: "https://example.test/avatar.png",
    });
  }
  return originalFetch(input, init);
};
try {
  const callbackResponse = await fetchWorker(
    `/api/auth/callback/google?state=${encodeURIComponent(oauthState)}&code=oauth-code`,
    {},
    oauthEnv,
  );
  assert.equal(callbackResponse.status, 302);

  const callbackLocation = callbackResponse.headers.get("location");
  assert.ok(callbackLocation);
  const redirectUrl = new URL(callbackLocation);
  assert.equal(redirectUrl.origin, "https://videotosrt.org");
  assert.equal(redirectUrl.pathname, "/auth/complete");
  assert.equal(redirectUrl.searchParams.get("next"), "/dashboard");
  assert.equal(redirectUrl.searchParams.get("source"), "google");
  assert.equal(redirectUrl.searchParams.has("token"), false);

  const fragmentParams = new URLSearchParams(redirectUrl.hash.slice(1));
  const redirectToken = fragmentParams.get("token");
  assert.ok(redirectToken);

  const setCookieHeader = callbackResponse.headers.get("set-cookie") ?? "";
  const cookieTokenMatch = setCookieHeader.match(/vts_session=([^;]+)/);
  assert.ok(cookieTokenMatch);
  assert.equal(decodeURIComponent(cookieTokenMatch[1]), redirectToken);

  const payload = await session.verifySignedToken(redirectToken, oauthEnv.SESSION_SECRET);
  assert.equal(payload.userId, oauthEnv.__users[0].id);
  assert.equal(oauthEnv.__users[0].email, "User@Example.test");

  const bearerMeResponse = await fetchWorker("/api/auth/me", {
    headers: { Authorization: `Bearer ${redirectToken}` },
  }, oauthEnv);
  assert.equal(bearerMeResponse.status, 200);
  assert.equal((await bearerMeResponse.json()).data.user.email, "User@Example.test");

  const cookieMeResponse = await fetchWorker("/api/auth/me", {
    headers: { Cookie: `vts_session=${redirectToken}` },
  }, oauthEnv);
  assert.equal(cookieMeResponse.status, 200);
  assert.equal((await cookieMeResponse.json()).data.user.email, "User@Example.test");

  const lowerBearerMeResponse = await fetchWorker("/api/auth/me", {
    headers: { Authorization: `bearer ${redirectToken}` },
  }, oauthEnv);
  assert.equal(lowerBearerMeResponse.status, 200);
  assert.equal((await lowerBearerMeResponse.json()).data.user.email, "User@Example.test");

  const malformedBearerMeResponse = await fetchWorker("/api/auth/me", {
    headers: {
      Authorization: `Bearer ${redirectToken} extra`,
      Cookie: `vts_session=${redirectToken}`,
    },
  }, oauthEnv);
  assert.equal(malformedBearerMeResponse.status, 200);
  assert.equal((await malformedBearerMeResponse.json()).data.user, null);
} finally {
  globalThis.fetch = originalFetch;
}

const transcribeUser = {
  id: "user_transcribe",
  email: "transcribe@example.test",
  name: "Transcribe User",
  avatar: "",
  provider: "google",
  provider_id: "google-transcribe",
  plan: "pro",
  created_at: "2026-07-16T00:00:00.000Z",
  updated_at: "2026-07-16T00:00:00.000Z",
};
const transcribeEnv = createRequestTestEnv({ users: [transcribeUser] });
const transcribeToken = await session.createSignedToken(
  { userId: transcribeUser.id, exp: Math.floor(Date.now() / 1000) + 60 },
  transcribeEnv.SESSION_SECRET,
);
const transcribeHeaders = {
  Authorization: `Bearer ${transcribeToken}`,
  "Content-Type": "application/json",
};

async function postTranscribe(body, env = transcribeEnv) {
  return fetchWorker("/api/transcribe", {
    method: "POST",
    headers: transcribeHeaders,
    body: JSON.stringify(body),
  }, env);
}

for (const invalidSize of [undefined, null, 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, "1000"]) {
  const response = await postTranscribe({
    filename: "clip.mp4",
    audio_url: "https://r2.example.test/clip.mp4",
    duration_seconds: 120,
    ...(invalidSize !== undefined ? { file_size_bytes: invalidSize } : {}),
  });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error.code, "INVALID_FILE_SIZE");
}
assert.equal(transcribeEnv.__creditTransactions.length, 0);
assert.equal(transcribeEnv.__jobs.length, 0);
assert.equal(transcribeEnv.__queueMessages.length, 0);

const providerOversizedTranscribeResponse = await postTranscribe({
  filename: "large.mp4",
  audio_url: "https://r2.example.test/large.mp4",
  duration_seconds: 251,
  file_size_bytes: 100000001,
});
assert.equal(providerOversizedTranscribeResponse.status, 413);
const providerOversizedTranscribePayload = await providerOversizedTranscribeResponse.json();
assert.equal(providerOversizedTranscribePayload.error.code, "PROVIDER_FILE_SIZE_LIMIT");
assert.equal(providerOversizedTranscribePayload.error.message, "Files over 100,000,000 bytes must be submitted as provider-compatible audio chunks");
assert.equal(transcribeEnv.__creditTransactions.length, 0);
assert.equal(transcribeEnv.__jobs.length, 0);
assert.equal(transcribeEnv.__queueMessages.length, 0);

const acceptedTranscribeResponse = await postTranscribe({
  filename: "accepted.mp4",
  audio_url: "https://r2.example.test/accepted.mp4",
  duration_seconds: 120,
  file_size_bytes: 100000000,
});
assert.equal(acceptedTranscribeResponse.status, 202);
assert.equal(transcribeEnv.__creditTransactions.length, 1);
assert.equal(transcribeEnv.__jobs.length, 1);
assert.equal(transcribeEnv.__queueMessages.length, 1);
assert.equal(transcribeEnv.__queueMessages[0].fileSizeBytes, 100000000);

const acceptedLargeChunkedResponse = await postTranscribe({
  filename: "large.mp4",
  audio_url: "https://r2.example.test/large-source.mp4",
  duration_seconds: 240,
  file_size_bytes: 300000000,
  chunks: [
    { audio_url: "https://r2.example.test/chunk-1.wav", duration_seconds: 120, file_size_bytes: 64000000 },
    { audio_url: "https://r2.example.test/chunk-2.wav", duration_seconds: 120, file_size_bytes: 64000000 },
  ],
});
assert.equal(acceptedLargeChunkedResponse.status, 202);
assert.equal(transcribeEnv.__creditTransactions.length, 2);
assert.equal(transcribeEnv.__jobs.length, 2);
assert.equal(transcribeEnv.__queueMessages.length, 2);
assert.equal(transcribeEnv.__queueMessages[1].fileSizeBytes, 300000000);
assert.deepEqual(transcribeEnv.__queueMessages[1].chunks, [
  { audioUrl: "https://r2.example.test/chunk-1.wav", durationSeconds: 120, fileSizeBytes: 64000000 },
  { audioUrl: "https://r2.example.test/chunk-2.wav", durationSeconds: 120, fileSizeBytes: 64000000 },
]);

const tooLargeApplicationResponse = await postTranscribe({
  filename: "too-large.mp4",
  audio_url: "https://r2.example.test/too-large.mp4",
  duration_seconds: 240,
  file_size_bytes: 300000001,
  chunks: [
    { audio_url: "https://r2.example.test/chunk.wav", duration_seconds: 240, file_size_bytes: 12800000 },
  ],
});
assert.equal(tooLargeApplicationResponse.status, 413);
const tooLargeApplicationPayload = await tooLargeApplicationResponse.json();
assert.equal(tooLargeApplicationPayload.error.code, "APPLICATION_FILE_SIZE_LIMIT");
assert.equal(tooLargeApplicationPayload.error.message, "Automatic transcription supports files up to 300,000,000 bytes");
assert.equal(transcribeEnv.__creditTransactions.length, 2);
assert.equal(transcribeEnv.__jobs.length, 2);
assert.equal(transcribeEnv.__queueMessages.length, 2);

const badChunkResponse = await postTranscribe({
  filename: "bad-chunks.mp4",
  audio_url: "https://r2.example.test/bad-chunks.mp4",
  duration_seconds: 240,
  file_size_bytes: 150000000,
  chunks: [
    { audio_url: "https://r2.example.test/chunk-too-large.wav", duration_seconds: 120, file_size_bytes: 100000001 },
  ],
});
assert.equal(badChunkResponse.status, 400);
assert.equal((await badChunkResponse.json()).error.code, "INVALID_TRANSCRIPTION_CHUNKS");

const unexpectedChunkResponse = await postTranscribe({
  filename: "small-with-chunks.mp4",
  audio_url: "https://r2.example.test/small-with-chunks.mp4",
  duration_seconds: 60,
  file_size_bytes: 100000000,
  chunks: [
    { audio_url: "https://r2.example.test/chunk.wav", duration_seconds: 60, file_size_bytes: 1600000 },
  ],
});
assert.equal(unexpectedChunkResponse.status, 400);
assert.equal((await unexpectedChunkResponse.json()).error.code, "UNEXPECTED_TRANSCRIPTION_CHUNKS");

const mismatchedChunkDurationResponse = await postTranscribe({
  filename: "mismatched-chunks.mp4",
  audio_url: "https://r2.example.test/mismatched-chunks.mp4",
  duration_seconds: 60,
  file_size_bytes: 150000000,
  chunks: [
    { audio_url: "https://r2.example.test/chunk-1.wav", duration_seconds: 300, file_size_bytes: 9600000 },
    { audio_url: "https://r2.example.test/chunk-2.wav", duration_seconds: 300, file_size_bytes: 9600000 },
  ],
});
assert.equal(mismatchedChunkDurationResponse.status, 400);
assert.equal((await mismatchedChunkDurationResponse.json()).error.code, "INVALID_TRANSCRIPTION_CHUNK_DURATION");

const idempotentEnv = createRequestTestEnv({ users: [transcribeUser] });
const firstIdempotentResponse = await postTranscribe({
  filename: "idempotent.mp4",
  audio_url: "https://r2.example.test/idempotent.mp4",
  duration_seconds: 120,
  file_size_bytes: 100000000,
  idempotency_key: "upload_retry_12345",
}, idempotentEnv);
assert.equal(firstIdempotentResponse.status, 202);
const firstIdempotentPayload = await firstIdempotentResponse.json();
const secondIdempotentResponse = await postTranscribe({
  filename: "idempotent.mp4",
  audio_url: "https://r2.example.test/idempotent.mp4",
  duration_seconds: 120,
  file_size_bytes: 100000000,
  idempotency_key: "upload_retry_12345",
}, idempotentEnv);
assert.equal(secondIdempotentResponse.status, 202);
const secondIdempotentPayload = await secondIdempotentResponse.json();
assert.equal(secondIdempotentPayload.data.job_id, firstIdempotentPayload.data.job_id);
assert.equal(idempotentEnv.__creditTransactions.length, 1);
assert.equal(idempotentEnv.__jobs.length, 1);
assert.equal(idempotentEnv.__queueMessages.length, 1);

function okGroqJson() {
  return JSON.stringify({ segments: [{ start: 0, end: 1.25, text: " hello " }] });
}

const originalFetchForAi = globalThis.fetch;
const smallFetchCalls = [];
globalThis.fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input.url;
  smallFetchCalls.push({ url, init });
  if (url === "https://r2.example.test/small.mp4") {
    return new Response(new Blob(["small-audio"], { type: "video/mp4" }));
  }
  assert.equal(url, "https://api.groq.com/openai/v1/audio/transcriptions");
  const form = init.body;
  assert.equal(form.get("model"), "whisper-large-v3-turbo");
  assert.equal(form.get("response_format"), "verbose_json");
  assert.ok(form.get("file") instanceof File);
  assert.equal(form.get("url"), null);
  return new Response(okGroqJson());
};
try {
  const srt = await ai.transcribeWithGroq({ GROQ_API_KEY: "groq-key" }, "https://r2.example.test/small.mp4", "small.mp4", 25000000);
  assert.match(srt, /hello/);
  assert.equal(smallFetchCalls.length, 2);
} finally {
  globalThis.fetch = originalFetchForAi;
}

const urlModeFetchCalls = [];
globalThis.fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input.url;
  urlModeFetchCalls.push({ url, init });
  assert.equal(url, "https://api.groq.com/openai/v1/audio/transcriptions");
  const form = init.body;
  assert.equal(form.get("model"), "whisper-large-v3-turbo");
  assert.equal(form.get("response_format"), "verbose_json");
  assert.equal(form.get("url"), "https://r2.example.test/medium.mp4");
  assert.equal(form.get("file"), null);
  return new Response(okGroqJson());
};
try {
  const srt = await ai.transcribeWithGroq({ GROQ_API_KEY: "groq-key" }, "https://r2.example.test/medium.mp4", "medium.mp4", 25000001);
  assert.match(srt, /hello/);
  assert.equal(urlModeFetchCalls.length, 1);
} finally {
  globalThis.fetch = originalFetchForAi;
}

const originalConsoleError = console.error;
const groqErrorLogs = [];
globalThis.fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input.url;
  assert.equal(url, "https://api.groq.com/openai/v1/audio/transcriptions");
  const form = init.body;
  assert.equal(form.get("url"), "https://r2.example.test/signed.mp4?X-Amz-Signature=secret");
  return new Response(
    "provider echoed https://r2.example.test/signed.mp4?X-Amz-Signature=secret signed.mp4",
    { status: 413, statusText: "Payload Too Large" },
  );
};
console.error = (...args) => {
  groqErrorLogs.push(args);
};
try {
  await assert.rejects(
    ai.transcribeWithGroq(
      { GROQ_API_KEY: "groq-key" },
      "https://r2.example.test/signed.mp4?X-Amz-Signature=secret",
      "signed.mp4",
      25000001,
    ),
    ai.TranscriptionProviderError,
  );
  assert.equal(groqErrorLogs.length, 1);
  assert.equal(groqErrorLogs[0][0], "[Groq API Error]");
  assert.deepEqual(groqErrorLogs[0][1], {
    provider: "groq",
    status: 413,
    statusText: "Payload Too Large",
    payloadMode: "url",
  });
  assert.equal(JSON.stringify(groqErrorLogs).includes("X-Amz-Signature"), false);
  assert.equal(JSON.stringify(groqErrorLogs).includes("signed.mp4"), false);
} finally {
  globalThis.fetch = originalFetchForAi;
  console.error = originalConsoleError;
}

assert.equal(worker.isNonRetriableProviderError(new ai.TranscriptionProviderError(400, "bad request", true)), true);
assert.equal(worker.isNonRetriableProviderError(new ai.TranscriptionProviderError(404, "not found", true)), true);
assert.equal(worker.isNonRetriableProviderError(new ai.TranscriptionProviderError(408, "timeout", true)), false);
assert.equal(worker.isNonRetriableProviderError(new ai.TranscriptionProviderError(409, "conflict", true)), false);
assert.equal(worker.isNonRetriableProviderError(new ai.TranscriptionProviderError(429, "rate limit", true)), false);
assert.equal(worker.isNonRetriableProviderError(new ai.TranscriptionProviderError(500, "server error", true)), false);
assert.equal(worker.sanitizeProviderFailureReason(new ai.TranscriptionProviderError(400, "bad file https://signed.example.test/video.mp4?secret=1 Bearer abc", true)), "Transcription provider rejected the file with status 400.");

function queueMessage(body, attempts = 1) {
  let ackCount = 0;
  let retryCount = 0;
  return {
    id: body.jobId,
    attempts,
    body,
    ack: () => {
      ackCount += 1;
    },
    retry: () => {
      retryCount += 1;
    },
    counts: () => ({ ackCount, retryCount }),
  };
}

const nonRetryEnv = createRequestTestEnv({ users: [transcribeUser] });
nonRetryEnv.GROQ_API_KEY = "groq-key";
nonRetryEnv.__jobs.push({
  id: "job_nonretry",
  user_id: transcribeUser.id,
  status: "queued",
  filename: "bad.mp4",
  audio_url: "https://r2.example.test/bad.mp4",
  duration_seconds: 120,
  created_at: "2026-07-16T00:00:00.000Z",
  updated_at: "2026-07-16T00:00:00.000Z",
});
const nonRetryQueueMessage = queueMessage({
  jobId: "job_nonretry",
  userId: transcribeUser.id,
  audioUrl: "https://r2.example.test/bad.mp4",
  filename: "bad.mp4",
  durationSeconds: 120,
  fileSizeBytes: 25000001,
  createdAt: "2026-07-16T00:00:00.000Z",
});
globalThis.fetch = async () => new Response("provider says signed URL https://r2.example.test/bad.mp4?secret=1 failed", { status: 400 });
try {
  await worker.default.queue({ messages: [nonRetryQueueMessage] }, nonRetryEnv);
  assert.deepEqual(nonRetryQueueMessage.counts(), { ackCount: 1, retryCount: 0 });
  assert.equal(nonRetryEnv.__jobs[0].status, "failed");
  assert.equal(nonRetryEnv.__jobs[0].srt_content, "Transcription provider rejected the file with status 400.");
  assert.equal(nonRetryEnv.__jobs[0].srt_content.includes("r2.example"), false);
  assert.equal(nonRetryEnv.__creditTransactions.length, 1);
} finally {
  globalThis.fetch = originalFetchForAi;
}

const retryEnv = createRequestTestEnv({ users: [transcribeUser] });
retryEnv.GROQ_API_KEY = "groq-key";
retryEnv.__jobs.push({
  id: "job_retry",
  user_id: transcribeUser.id,
  status: "queued",
  filename: "rate-limited.mp4",
  audio_url: "https://r2.example.test/rate-limited.mp4",
  duration_seconds: 120,
  created_at: "2026-07-16T00:00:00.000Z",
  updated_at: "2026-07-16T00:00:00.000Z",
});
const retryQueueMessage = queueMessage({
  jobId: "job_retry",
  userId: transcribeUser.id,
  audioUrl: "https://r2.example.test/rate-limited.mp4",
  filename: "rate-limited.mp4",
  durationSeconds: 120,
  fileSizeBytes: 25000001,
  createdAt: "2026-07-16T00:00:00.000Z",
});
globalThis.fetch = async () => new Response("rate limited", { status: 429 });
try {
  await worker.default.queue({ messages: [retryQueueMessage] }, retryEnv);
  assert.deepEqual(retryQueueMessage.counts(), { ackCount: 0, retryCount: 1 });
  assert.equal(retryEnv.__jobs[0].status, "processing");
  assert.equal(retryEnv.__creditTransactions.length, 0);
} finally {
  globalThis.fetch = originalFetchForAi;
}

const chunkedEnv = createRequestTestEnv({ users: [transcribeUser] });
chunkedEnv.GROQ_API_KEY = "groq-key";
chunkedEnv.__jobs.push({
  id: "job_chunked",
  user_id: transcribeUser.id,
  status: "queued",
  filename: "chunked.mp4",
  audio_url: "https://r2.example.test/chunked.mp4",
  duration_seconds: 240,
  created_at: "2026-07-16T00:00:00.000Z",
  updated_at: "2026-07-16T00:00:00.000Z",
});
const chunkedQueueMessage = queueMessage({
  jobId: "job_chunked",
  userId: transcribeUser.id,
  audioUrl: "https://r2.example.test/chunked.mp4",
  filename: "chunked.mp4",
  durationSeconds: 240,
  fileSizeBytes: 150000000,
  chunks: [
    { audioUrl: "https://r2.example.test/chunk-a.wav", durationSeconds: 120, fileSizeBytes: 64000000 },
    { audioUrl: "https://r2.example.test/chunk-b.wav", durationSeconds: 120, fileSizeBytes: 64000000 },
  ],
  createdAt: "2026-07-16T00:00:00.000Z",
});
const chunkedProviderUrls = [];
globalThis.fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input.url;
  chunkedProviderUrls.push(url);
  assert.equal(url, "https://api.groq.com/openai/v1/audio/transcriptions");
  const form = init.body;
  const chunkUrl = form.get("url");
  if (chunkUrl === "https://r2.example.test/chunk-a.wav") {
    return new Response(JSON.stringify({ segments: [{ start: 1, end: 3, text: " first " }] }));
  }
  if (chunkUrl === "https://r2.example.test/chunk-b.wav") {
    return new Response(JSON.stringify({ segments: [{ start: 2, end: 5, text: " second " }] }));
  }
  throw new Error("unexpected chunk URL");
};
try {
  await worker.default.queue({ messages: [chunkedQueueMessage] }, chunkedEnv);
  assert.deepEqual(chunkedQueueMessage.counts(), { ackCount: 1, retryCount: 0 });
  assert.equal(chunkedEnv.__jobs[0].status, "completed");
  assert.match(chunkedEnv.__jobs[0].srt_content, /00:00:01,000 --> 00:00:03,000\nfirst/);
  assert.match(chunkedEnv.__jobs[0].srt_content, /00:02:02,000 --> 00:02:05,000\nsecond/);
  assert.deepEqual(chunkedProviderUrls, [
    "https://api.groq.com/openai/v1/audio/transcriptions",
    "https://api.groq.com/openai/v1/audio/transcriptions",
  ]);
} finally {
  globalThis.fetch = originalFetchForAi;
}

const chunkFailureEnv = createRequestTestEnv({ users: [transcribeUser] });
chunkFailureEnv.GROQ_API_KEY = "groq-key";
chunkFailureEnv.__jobs.push({
  id: "job_chunk_fail",
  user_id: transcribeUser.id,
  status: "queued",
  filename: "chunk-fail.mp4",
  audio_url: "https://r2.example.test/chunk-fail.mp4",
  duration_seconds: 240,
  created_at: "2026-07-16T00:00:00.000Z",
  updated_at: "2026-07-16T00:00:00.000Z",
});
const chunkFailureQueueMessage = queueMessage({
  jobId: "job_chunk_fail",
  userId: transcribeUser.id,
  audioUrl: "https://r2.example.test/chunk-fail.mp4",
  filename: "chunk-fail.mp4",
  durationSeconds: 240,
  fileSizeBytes: 150000000,
  chunks: [
    { audioUrl: "https://r2.example.test/chunk-a.wav", durationSeconds: 120, fileSizeBytes: 64000000 },
    { audioUrl: "https://r2.example.test/chunk-b.wav?X-Amz-Signature=secret", durationSeconds: 120, fileSizeBytes: 64000000 },
  ],
  createdAt: "2026-07-16T00:00:00.000Z",
});
globalThis.fetch = async (_input, init) => {
  const chunkUrl = init.body.get("url");
  if (chunkUrl === "https://r2.example.test/chunk-a.wav") {
    return new Response(JSON.stringify({ segments: [{ start: 1, end: 3, text: " first " }] }));
  }
  return new Response("provider echoed https://r2.example.test/chunk-b.wav?X-Amz-Signature=secret", { status: 400 });
};
try {
  await worker.default.queue({ messages: [chunkFailureQueueMessage] }, chunkFailureEnv);
  assert.deepEqual(chunkFailureQueueMessage.counts(), { ackCount: 1, retryCount: 0 });
  assert.equal(chunkFailureEnv.__jobs[0].status, "failed");
  assert.equal(chunkFailureEnv.__jobs[0].srt_content, "Transcription provider rejected the file with status 400.");
  assert.equal(chunkFailureEnv.__jobs[0].srt_content.includes("X-Amz-Signature"), false);
  assert.equal(chunkFailureEnv.__creditTransactions.length, 1);
} finally {
  globalThis.fetch = originalFetchForAi;
}

const uploadUser = {
  id: "user_upload",
  email: "upload@example.test",
  name: "Upload User",
  avatar: "",
  provider: "google",
  provider_id: "google-upload",
  plan: "free",
  created_at: "2026-07-16T00:00:00.000Z",
  updated_at: "2026-07-16T00:00:00.000Z",
};
const uploadEnv = createRequestTestEnv({ users: [uploadUser] });
const uploadObjects = new Map();
const deletedUploadKeys = [];
const uploadHeadKeys = [];
uploadEnv.R2 = {
  async head(key) {
    uploadHeadKeys.push(key);
    return uploadObjects.get(key) ?? null;
  },
  async delete(key) {
    deletedUploadKeys.push(key);
    uploadObjects.delete(key);
  },
  async put() {
    return {};
  },
};
const uploadSessionToken = await session.createSignedToken(
  { userId: uploadUser.id, exp: Math.floor(Date.now() / 1000) + 60 },
  uploadEnv.SESSION_SECRET,
);
const uploadAuthHeaders = { Authorization: `Bearer ${uploadSessionToken}` };

const missingSizePresignResponse = await fetchWorker(
  "/api/upload/presign?filename=clip.mp4&contentType=video/mp4",
  { headers: uploadAuthHeaders },
  uploadEnv,
);
assert.equal(missingSizePresignResponse.status, 400);
assert.equal((await missingSizePresignResponse.json()).error.code, "INVALID_SIZE");

const zeroSizePresignResponse = await fetchWorker(
  "/api/upload/presign?filename=clip.mp4&contentType=video/mp4&size=0",
  { headers: uploadAuthHeaders },
  uploadEnv,
);
assert.equal(zeroSizePresignResponse.status, 400);
assert.equal((await zeroSizePresignResponse.json()).error.code, "EMPTY_FILE");

const oversizedPresignResponse = await fetchWorker(
  "/api/upload/presign?filename=clip.mp4&contentType=video/mp4&size=1073741825",
  { headers: uploadAuthHeaders },
  uploadEnv,
);
assert.equal(oversizedPresignResponse.status, 413);
assert.equal((await oversizedPresignResponse.json()).error.code, "FILE_TOO_LARGE");

const unsafeTypePresignResponse = await fetchWorker(
  "/api/upload/presign?filename=clip.mp4&contentType=text/html&size=1000",
  { headers: uploadAuthHeaders },
  uploadEnv,
);
assert.equal(unsafeTypePresignResponse.status, 400);
assert.equal((await unsafeTypePresignResponse.json()).error.code, "INVALID_CONTENT_TYPE");

const validPresignResponse = await fetchWorker(
  "/api/upload/presign?filename=..%2Funsafe%20clip.mp4&contentType=video/mp4&size=1073741824",
  { headers: uploadAuthHeaders },
  uploadEnv,
);
assert.equal(validPresignResponse.status, 200);
const validPresignPayload = (await validPresignResponse.json()).data;
assert.match(validPresignPayload.key, /^uploads\/user_upload\/media_[a-z0-9]+\.mp4$/);
assert.equal(validPresignPayload.filename, "unsafe clip.mp4");
assert.equal(validPresignPayload.contentType, "video/mp4");
assert.equal(validPresignPayload.size, 1073741824);
assert.match(validPresignPayload.url, /^https:\/\/test-account\.r2\.cloudflarestorage\.com\/test-bucket\/uploads\/user_upload\/media_/);
const signedPutUrl = new URL(validPresignPayload.url);
assert.equal(signedPutUrl.searchParams.get("X-Amz-SignedHeaders"), "content-type;host");
assert.ok(signedPutUrl.searchParams.get("X-Amz-Signature"));

const ownedUploadUrlResponse = await fetchWorker(
  `/api/upload/url?key=${encodeURIComponent(validPresignPayload.key)}`,
  { headers: uploadAuthHeaders },
  uploadEnv,
);
assert.equal(ownedUploadUrlResponse.status, 404);
assert.equal((await ownedUploadUrlResponse.json()).error.code, "UPLOAD_NOT_FOUND");
assert.deepEqual(deletedUploadKeys, []);

const emptyUploadKey = "uploads/user_upload/media_empty.mp4";
uploadObjects.set(emptyUploadKey, { key: emptyUploadKey, size: 0 });
const emptyUploadUrlResponse = await fetchWorker(
  `/api/upload/url?key=${encodeURIComponent(emptyUploadKey)}`,
  { headers: uploadAuthHeaders },
  uploadEnv,
);
assert.equal(emptyUploadUrlResponse.status, 400);
assert.equal((await emptyUploadUrlResponse.json()).error.code, "EMPTY_FILE");
assert.deepEqual(deletedUploadKeys, [emptyUploadKey]);
assert.equal(uploadObjects.has(emptyUploadKey), false);

const oversizedUploadKey = "uploads/user_upload/media_oversized.mp4";
uploadObjects.set(oversizedUploadKey, { key: oversizedUploadKey, size: 1073741825 });
const oversizedUploadUrlResponse = await fetchWorker(
  `/api/upload/url?key=${encodeURIComponent(oversizedUploadKey)}`,
  { headers: uploadAuthHeaders },
  uploadEnv,
);
assert.equal(oversizedUploadUrlResponse.status, 413);
assert.equal((await oversizedUploadUrlResponse.json()).error.code, "FILE_TOO_LARGE");
assert.deepEqual(deletedUploadKeys, [emptyUploadKey, oversizedUploadKey]);
assert.equal(uploadObjects.has(oversizedUploadKey), false);

uploadObjects.set(validPresignPayload.key, { key: validPresignPayload.key, size: 1073741824 });
const validOwnedUploadUrlResponse = await fetchWorker(
  `/api/upload/url?key=${encodeURIComponent(validPresignPayload.key)}`,
  { headers: uploadAuthHeaders },
  uploadEnv,
);
assert.equal(validOwnedUploadUrlResponse.status, 200);
assert.match((await validOwnedUploadUrlResponse.json()).data.url, /^https:\/\/test-account\.r2\.cloudflarestorage\.com\/test-bucket\/uploads\/user_upload\/media_/);

const forbiddenUploadUrlResponse = await fetchWorker(
  "/api/upload/url?key=uploads/other_user/media_file.mp4",
  { headers: uploadAuthHeaders },
  uploadEnv,
);
assert.equal(forbiddenUploadUrlResponse.status, 403);
assert.equal((await forbiddenUploadUrlResponse.json()).error.code, "FORBIDDEN");
assert.equal(uploadHeadKeys.includes("uploads/other_user/media_file.mp4"), false);

const rootResponse = await fetchWorker("/");
assert.equal(rootResponse.status, 200);
assert.equal(rootResponse.headers.get("x-robots-tag"), "noindex,nofollow");
assert.equal(await rootResponse.text(), "asset:/");

const staticResponse = await fetchWorker("/index.html");
assert.equal(staticResponse.status, 200);
assert.equal(staticResponse.headers.get("x-robots-tag"), "noindex,nofollow");
assert.equal(await staticResponse.text(), "asset:/index.html");

const now = new Date("2026-07-16T00:00:00.000Z");
const cutoff = retention.retentionCutoff(now);
assert.equal(cutoff.toISOString(), "2026-07-09T00:00:00.000Z");

assert.equal(
  retention.isExpiredUploadObject(
    { key: "uploads/user/media.mp4", customMetadata: { uploaded_at: "2026-07-08T23:59:59.000Z" } },
    cutoff,
  ),
  true,
);
assert.equal(
  retention.isExpiredUploadObject(
    { key: "uploads/user/media.mp4", uploaded: new Date("2026-07-08T23:59:59.000Z") },
    cutoff,
  ),
  true,
);
assert.equal(
  retention.isExpiredUploadObject(
    { key: "uploads/user/media.mp4", uploaded: new Date("2026-07-09T00:00:00.000Z") },
    cutoff,
  ),
  false,
);
assert.equal(
  retention.isExpiredUploadObject(
    { key: "avatars/user.png", customMetadata: { uploaded_at: "2026-07-01T00:00:00.000Z" } },
    cutoff,
  ),
  false,
);
assert.equal(
  retention.isExpiredUploadObject(
    { key: "uploads/user/media.mp4", customMetadata: { uploaded_at: "not-a-date" } },
    cutoff,
  ),
  false,
);

const listCalls = [];
const deletedKeys = [];
await retention.deleteExpiredUploads({
  async list(options) {
    listCalls.push(options);
    if (!options.cursor) {
      return {
        truncated: true,
        cursor: "next",
        objects: [
          { key: "uploads/a.mp4", customMetadata: { uploaded_at: "2026-07-08T00:00:00.000Z" }, uploaded: new Date("2026-07-15T00:00:00.000Z") },
          { key: "uploads/cutoff.mp4", customMetadata: { uploaded_at: "2026-07-09T00:00:00.000Z" } },
        ],
      };
    }
    return {
      truncated: false,
      objects: [
        { key: "uploads/b.mp4", uploaded: new Date("2026-07-08T00:00:00.000Z") },
        { key: "other/c.mp4", customMetadata: { uploaded_at: "2026-07-01T00:00:00.000Z" } },
      ],
    };
  },
  async delete(keys) {
    deletedKeys.push(...keys);
  },
}, now);

assert.deepEqual(listCalls, [
  { prefix: "uploads/", cursor: undefined, include: ["customMetadata"] },
  { prefix: "uploads/", cursor: "next", include: ["customMetadata"] },
]);
assert.deepEqual(deletedKeys, ["uploads/a.mp4", "uploads/b.mp4"]);

console.log("backend helper tests passed");
