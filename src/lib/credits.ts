import { createId, currentMonth, nowIso } from "./env";
import type { Bindings } from "../types";

const DEFAULT_MONTHLY_LIMIT = 30;

export async function ensureUsageRecord(env: Bindings, userId: string, month = currentMonth()) {
  const now = nowIso();
  await env.DB.prepare(
    `INSERT OR IGNORE INTO usage_records (id, user_id, month, minutes_used, minutes_limit, created_at, updated_at)
     VALUES (?, ?, ?, 0, ?, ?, ?)`,
  )
    .bind(createId("usage"), userId, month, DEFAULT_MONTHLY_LIMIT, now, now)
    .run();
}

export async function getUsage(env: Bindings, userId: string, month = currentMonth()) {
  await ensureUsageRecord(env, userId, month);
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

export async function consumeMinutes(env: Bindings, userId: string, minutes: number, description: string) {
  const month = currentMonth();
  await ensureUsageRecord(env, userId, month);

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

  if ((result.meta.changes ?? 0) !== 1) return false;

  await env.DB.prepare(
    `INSERT INTO credit_transactions (id, user_id, amount, type, description, created_at)
     VALUES (?, ?, ?, 'debit', ?, ?)`,
  )
    .bind(createId("txn"), userId, -minutes, description, now)
    .run();

  return true;
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
