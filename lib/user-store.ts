import type { LocalAuthUser } from "@/lib/local-auth";

export type UserStoreEnv = CloudflareEnv & {
  ADMIN_USERS_TOKEN?: string;
  DB?: D1DatabaseLike;
};

type D1DatabaseLike = {
  prepare(query: string): D1PreparedStatementLike;
};

type D1PreparedStatementLike = {
  all<T = unknown>(): Promise<{ results?: T[] }>;
  bind(...values: unknown[]): D1PreparedStatementLike;
  first<T = unknown>(): Promise<T | null>;
  run(): Promise<unknown>;
};

export type StoredUser = {
  created_at: string;
  email: string;
  id: string;
  last_login_at: string;
  plan: string;
  provider: string;
};

export function hasUserStore(env: UserStoreEnv) {
  return Boolean(env.DB);
}

export async function upsertUserLogin(env: UserStoreEnv, user: LocalAuthUser, provider = "email") {
  if (!env.DB) {
    return { stored: false as const };
  }

  await env.DB
    .prepare(
      `INSERT INTO users (id, email, name, avatar, provider, provider_id, plan, created_at, updated_at, last_login_at)
       VALUES (?, ?, ?, NULL, ?, ?, 'free', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT(id) DO UPDATE SET
         email = excluded.email,
         name = excluded.name,
         provider = excluded.provider,
         provider_id = excluded.provider_id,
         updated_at = CURRENT_TIMESTAMP,
         last_login_at = CURRENT_TIMESTAMP`
    )
    .bind(user.id, user.email, user.name, provider, user.email)
    .run();

  return { stored: true as const };
}

export async function getUserStats(env: UserStoreEnv) {
  if (!env.DB) {
    return null;
  }

  const total = await env.DB
    .prepare("SELECT COUNT(DISTINCT email) AS count FROM users")
    .first<{ count: number }>();
  const records = await env.DB
    .prepare("SELECT COUNT(*) AS count FROM users")
    .first<{ count: number }>();
  const users = await env.DB
    .prepare(
      `SELECT
         email AS id,
         email,
         GROUP_CONCAT(DISTINCT provider) AS provider,
         MAX(plan) AS plan,
         MIN(created_at) AS created_at,
         MAX(COALESCE(last_login_at, updated_at)) AS last_login_at
       FROM users
       GROUP BY email
       ORDER BY last_login_at DESC
       LIMIT 500`
    )
    .all<StoredUser>();

  return {
    count: total?.count ?? 0,
    records_count: records?.count ?? 0,
    users: users.results ?? []
  };
}
