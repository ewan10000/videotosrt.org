import assert from "node:assert/strict";

const plans = await import("../dist/lib/plans.js");
const retention = await import("../dist/lib/retention.js");
const duration = await import("../dist/lib/duration.js");
const refund = await import("../dist/lib/refund.js");
const queue = await import("../dist/lib/queue.js");
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
  return {
    SITE_NAME: "VideoToSRT",
    APP_ORIGIN: "https://videotosrt.org",
    SESSION_SECRET: "test-secret",
    DB: {
      prepare(sql) {
        queries.push(sql);
        return {
          bind() {
            return this;
          },
          run: async () => ({}),
          all: async () => ({ results: [{ name: "plan" }, { name: "extra_credit_hours" }, { name: "last_login_at" }] }),
          first: async () => {
            if (options.failSessionLookup) throw new Error("session lookup failed");
            return null;
          },
        };
      },
    },
    ASSETS: {
      fetch: async (request) => new Response(`asset:${new URL(request.url).pathname}`, {
        headers: { "content-type": "text/html; charset=utf-8" },
      }),
    },
    __queries: queries,
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
