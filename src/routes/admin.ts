import { Hono } from "hono";
import type { Context } from "hono";
import { currentMonth } from "../lib/env";
import { fail, ok } from "../lib/response";
import type { HonoAppEnv } from "../types";

const SIGNATURE_TOLERANCE_SECONDS = 300;
const RECENT_JOB_LIMIT = 10;
const FAILED_JOB_LIMIT = 10;
const ERROR_SNIPPET_LENGTH = 240;

type CountRow = {
  count: number;
};

type UsageSummaryRow = {
  usage_rows: number;
  total_minutes_used: number;
  total_minutes_limit: number;
};

type StatusCountRow = {
  status: string;
  count: number;
};

type RecentJobRow = {
  id: string;
  user_email: string | null;
  status: string;
  filename: string;
  duration_seconds: number;
  created_at: string;
  updated_at: string;
};

type FailedJobRow = RecentJobRow & {
  error_snippet: string | null;
};

export const adminRoutes = new Hono<HonoAppEnv>();

async function hmacHex(value: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function verifyShipAnyAdminSignature(c: Context<HonoAppEnv>) {
  const secret = c.env.SHIPANY_BRIDGE_SECRET;
  if (!secret) {
    return { ok: false as const, response: fail(c, 500, "BRIDGE_NOT_CONFIGURED", "ShipAny bridge is not configured") };
  }

  const tsHeader = c.req.header("x-shipany-ts");
  const signature = c.req.header("x-shipany-signature")?.trim().toLowerCase();
  const ts = tsHeader ? Number(tsHeader) : NaN;

  if (!Number.isSafeInteger(ts) || !signature || !/^[a-f0-9]{64}$/.test(signature)) {
    return { ok: false as const, response: fail(c, 401, "INVALID_ADMIN_SIGNATURE", "Missing admin signature") };
  }

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > SIGNATURE_TOLERANCE_SECONDS) {
    return { ok: false as const, response: fail(c, 401, "ADMIN_SIGNATURE_EXPIRED", "Admin signature expired") };
  }

  const expected = await hmacHex(`admin-summary.${ts}`, secret);
  if (!constantTimeEqual(expected, signature)) {
    return { ok: false as const, response: fail(c, 401, "INVALID_ADMIN_SIGNATURE", "Invalid admin signature") };
  }

  return { ok: true as const };
}

async function getAdminSummary(c: Context<HonoAppEnv>) {
  const verified = await verifyShipAnyAdminSignature(c);
  if (!verified.ok) return verified.response;

  const month = currentMonth();
  const statusCounts = {
    queued: 0,
    processing: 0,
    completed: 0,
    failed: 0,
  };

  const [users, usage, jobs, statuses, recentJobs, failedJobs] = await Promise.all([
    c.env.DB.prepare("SELECT COUNT(*) AS count FROM users").first<CountRow>(),
    c.env.DB.prepare(
      `SELECT
         COUNT(*) AS usage_rows,
         COALESCE(SUM(minutes_used), 0) AS total_minutes_used,
         COALESCE(SUM(minutes_limit), 0) AS total_minutes_limit
       FROM usage_records
       WHERE month = ?`,
    )
      .bind(month)
      .first<UsageSummaryRow>(),
    c.env.DB.prepare("SELECT COUNT(*) AS count FROM transcription_jobs").first<CountRow>(),
    c.env.DB.prepare(
      `SELECT status, COUNT(*) AS count
       FROM transcription_jobs
       GROUP BY status`,
    ).all<StatusCountRow>(),
    c.env.DB.prepare(
      `SELECT
         j.id,
         u.email AS user_email,
         j.status,
         j.filename,
         j.duration_seconds,
         j.created_at,
         j.updated_at
       FROM transcription_jobs j
       LEFT JOIN users u ON u.id = j.user_id
       ORDER BY j.created_at DESC
       LIMIT ?`,
    )
      .bind(RECENT_JOB_LIMIT)
      .all<RecentJobRow>(),
    c.env.DB.prepare(
      `SELECT
         j.id,
         u.email AS user_email,
         j.status,
         j.filename,
         j.duration_seconds,
         j.created_at,
         j.updated_at,
         substr(COALESCE(j.srt_content, ''), 1, ?) AS error_snippet
       FROM transcription_jobs j
       LEFT JOIN users u ON u.id = j.user_id
       WHERE j.status = 'failed'
       ORDER BY j.updated_at DESC
       LIMIT ?`,
    )
      .bind(ERROR_SNIPPET_LENGTH, FAILED_JOB_LIMIT)
      .all<FailedJobRow>(),
  ]);

  for (const row of statuses.results ?? []) {
    if (row.status in statusCounts) {
      statusCounts[row.status as keyof typeof statusCounts] = row.count;
    }
  }

  return ok(c, {
    users: {
      total: users?.count ?? 0,
    },
    usage: {
      month,
      rows: usage?.usage_rows ?? 0,
      total_minutes_used: usage?.total_minutes_used ?? 0,
      total_minutes_limit: usage?.total_minutes_limit ?? 0,
    },
    transcription_jobs: {
      total: jobs?.count ?? 0,
      status_counts: statusCounts,
      recent: recentJobs.results ?? [],
      failed: failedJobs.results ?? [],
    },
  });
}

adminRoutes.post("/admin/shipany/summary", getAdminSummary);
adminRoutes.get("/admin/shipany/summary", getAdminSummary);
