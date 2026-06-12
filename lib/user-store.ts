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
      `INSERT INTO users (id, email, provider, plan, created_at, last_login_at)
       VALUES (?, ?, ?, 'free', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT(email) DO UPDATE SET
         id = excluded.id,
         provider = excluded.provider,
         last_login_at = CURRENT_TIMESTAMP`
    )
    .bind(user.id, user.email, provider)
    .run();

  return { stored: true as const };
}

export async function getUserStats(env: UserStoreEnv) {
  if (!env.DB) {
    return null;
  }

  const total = await env.DB
    .prepare("SELECT COUNT(*) AS count FROM users")
    .first<{ count: number }>();
  const users = await env.DB
    .prepare("SELECT id, email, provider, plan, created_at, last_login_at FROM users ORDER BY last_login_at DESC LIMIT 500")
    .all<StoredUser>();

  return {
    count: total?.count ?? 0,
    users: users.results ?? []
  };
}
