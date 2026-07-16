import { createId, currentMonth, nowIso } from "./env";
import { getPlanQuota } from "./plans";
import { refundTransactionId, usageMonthFromCreatedAt } from "./refund";
import type { Bindings } from "../types";

export { usageMonthFromCreatedAt } from "./refund";

export async function ensureUsageRecord(env: Bindings, userId: string, month = currentMonth(), plan: unknown = "free") {
  const now = nowIso();
  const monthlyLimit = getPlanQuota(plan).monthlyMinutes;
  await env.DB.prepare(
    `INSERT OR IGNORE INTO usage_records (id, user_id, month, minutes_used, minutes_limit, created_at, updated_at)
     VALUES (?, ?, ?, 0, ?, ?, ?)`,
  )
    .bind(createId("usage"), userId, month, monthlyLimit, now, now)
    .run();

  await env.DB.prepare(
    `UPDATE usage_records
     SET minutes_limit = MAX(minutes_limit, ?), updated_at = ?
     WHERE user_id = ? AND month = ?`,
  )
    .bind(monthlyLimit, now, userId, month)
    .run();
}

export async function getUsage(env: Bindings, userId: string, month = currentMonth(), plan: unknown = "free") {
  await ensureUsageRecord(env, userId, month, plan);
  return env.DB.prepare(
    `SELECT user_id, month, minutes_used, minutes_limit, created_at, updated_at
     FROM usage_records
     WHERE user_id = ? AND month = ?`,
  )
    .bind(userId, month)
    .first<{
      user_id: string;
      month: string;
      minutes_used: number;
      minutes_limit: number;
      created_at: string;
      updated_at: string;
    }>();
}

export async function consumeMinutes(env: Bindings, userId: string, minutes: number, description: string, plan: unknown = "free") {
  const month = currentMonth();
  await ensureUsageRecord(env, userId, month, plan);

  const now = nowIso();

  const result = await env.DB.prepare(
    `UPDATE usage_records
     SET minutes_used = minutes_used + ?, updated_at = ?
     WHERE user_id = ?
       AND month = ?
       AND minutes_used + ? <= minutes_limit`,
  )
    .bind(minutes, now, userId, month, minutes)
    .run();

  if ((result.meta.changes ?? 0) !== 1) {
    return false;
  }

  await env.DB.prepare(
    `INSERT INTO credit_transactions (id, user_id, amount, type, description, created_at)
     VALUES (?, ?, ?, 'debit', ?, ?)`,
  )
    .bind(createId("txn"), userId, -minutes, description, now)
    .run();

  return true;
}

export async function refundJobMinutes(
  env: Bindings,
  input: {
    jobId: string;
    userId: string;
    durationSeconds: number;
    createdAt: string;
    description?: string;
  },
) {
  const minutes = Math.ceil(input.durationSeconds / 60);
  if (!Number.isFinite(minutes) || minutes <= 0) return { refunded: false, minutes: 0, month: usageMonthFromCreatedAt(input.createdAt) };

  const month = usageMonthFromCreatedAt(input.createdAt);
  const now = nowIso();
  const transactionId = refundTransactionId(input.jobId);
  const description = `${input.description ?? `Refund transcription job ${input.jobId}`} (${transactionId})`;

  const [, insert] = await env.DB.batch([
    env.DB.prepare(
      `INSERT OR IGNORE INTO usage_records (id, user_id, month, minutes_used, minutes_limit, created_at, updated_at)
       VALUES (?, ?, ?, 0, 0, ?, ?)`,
    ).bind(createId("usage"), input.userId, month, now, now),
    env.DB.prepare(
      `INSERT OR IGNORE INTO credit_transactions (id, user_id, amount, type, description, created_at)
       VALUES (?, ?, ?, 'credit', ?, ?)`,
    ).bind(transactionId, input.userId, minutes, description, now),
    env.DB.prepare(
      `UPDATE usage_records
       SET minutes_used = MAX(minutes_used - ?, 0), updated_at = ?
       WHERE user_id = ? AND month = ? AND changes() = 1`,
    ).bind(minutes, now, input.userId, month),
  ]);

  if ((insert.meta.changes ?? 0) !== 1) {
    return { refunded: false, minutes, month };
  }

  return { refunded: true, minutes, month };
}

export async function addCredits(env: Bindings, userId: string, minutes: number, description: string) {
  const month = currentMonth();
  await ensureUsageRecord(env, userId, month);

  const now = nowIso();
  await env.DB.prepare(
    `UPDATE usage_records
     SET minutes_limit = minutes_limit + ?, updated_at = ?
     WHERE user_id = ? AND month = ?`,
  )
    .bind(minutes, now, userId, month)
    .run();

  await env.DB.prepare(
    `INSERT INTO credit_transactions (id, user_id, amount, type, description, created_at)
     VALUES (?, ?, ?, 'credit', ?, ?)`,
  )
    .bind(createId("txn"), userId, minutes, description, now)
    .run();
}

export async function addCreditsIdempotent(
  env: Bindings,
  userId: string,
  minutes: number,
  description: string,
  transactionId: string,
) {
  const month = currentMonth();
  await ensureUsageRecord(env, userId, month);

  const now = nowIso();
  const insert = await env.DB.prepare(
    `INSERT OR IGNORE INTO credit_transactions (id, user_id, amount, type, description, created_at)
     VALUES (?, ?, ?, 'credit', ?, ?)`,
  )
    .bind(transactionId, userId, minutes, description, now)
    .run();

  if ((insert.meta.changes ?? 0) !== 1) {
    return { granted: false, duplicate: true };
  }

  await env.DB.prepare(
    `UPDATE usage_records
     SET minutes_limit = minutes_limit + ?, updated_at = ?
     WHERE user_id = ? AND month = ?`,
  )
    .bind(minutes, now, userId, month)
    .run();

  return { granted: true, duplicate: false };
}
