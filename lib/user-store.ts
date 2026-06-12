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
  extra_credit_hours?: number;
  id: string;
  last_login_at: string;
  plan: string;
  provider: string;
};

export function hasUserStore(env: UserStoreEnv) {
  return Boolean(env.DB);
}

async function ensureUserStoreSchema(env: UserStoreEnv) {
  if (!env.DB) {
    return;
  }

  try {
    await env.DB
      .prepare("ALTER TABLE users ADD COLUMN extra_credit_hours REAL NOT NULL DEFAULT 0")
      .run();
  } catch {
    // Column already exists on migrated databases.
  }

  await env.DB
    .prepare(
      `CREATE TABLE IF NOT EXISTS paypal_credit_orders (
        order_id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        hours REAL NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`
    )
    .run();
}

export async function upsertUserLogin(env: UserStoreEnv, user: LocalAuthUser, provider = "email") {
  if (!env.DB) {
    return { stored: false as const };
  }

  await ensureUserStoreSchema(env);

  await env.DB
    .prepare(
      `INSERT INTO users (id, email, name, avatar, provider, provider_id, plan, extra_credit_hours, created_at, updated_at, last_login_at)
       VALUES (?, ?, ?, NULL, ?, ?, 'free', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
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

export async function getStoredUserMembership(env: UserStoreEnv, user: Pick<LocalAuthUser, "email" | "id">) {
  if (!env.DB) {
    return null;
  }

  await ensureUserStoreSchema(env);

  return env.DB
    .prepare(
      `SELECT
         COALESCE(MAX(plan), 'free') AS plan,
         COALESCE(SUM(extra_credit_hours), 0) AS extra_credit_hours
       FROM users
       WHERE id = ? OR email = ?`
    )
    .bind(user.id, user.email)
    .first<{ extra_credit_hours: number; plan: string }>();
}

export async function addUserExtraCredits(env: UserStoreEnv, user: Pick<LocalAuthUser, "email" | "id" | "name">, hours: number) {
  if (!env.DB) {
    return { stored: false as const };
  }

  await ensureUserStoreSchema(env);

  const existingUser = await env.DB
    .prepare("SELECT id FROM users WHERE id = ? OR email = ? ORDER BY updated_at DESC LIMIT 1")
    .bind(user.id, user.email)
    .first<{ id: string }>();
  const userId = existingUser?.id ?? user.id;

  await env.DB
    .prepare(
      `INSERT INTO users (id, email, name, avatar, provider, provider_id, plan, extra_credit_hours, created_at, updated_at, last_login_at)
       VALUES (?, ?, ?, NULL, 'paypal', ?, 'free', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT(id) DO UPDATE SET
         email = excluded.email,
         name = COALESCE(users.name, excluded.name),
         extra_credit_hours = COALESCE(users.extra_credit_hours, 0) + excluded.extra_credit_hours,
         updated_at = CURRENT_TIMESTAMP`
    )
    .bind(userId, user.email, user.name, user.email, hours)
    .run();

  const membership = await getStoredUserMembership(env, { email: user.email, id: userId });
  return { applied: true as const, membership, stored: true as const };
}

export async function addUserExtraCreditsOnce(
  env: UserStoreEnv,
  user: Pick<LocalAuthUser, "email" | "id" | "name">,
  hours: number,
  orderId: string
) {
  if (!env.DB) {
    return { applied: false as const, membership: null, stored: false as const };
  }

  await ensureUserStoreSchema(env);

  const existingOrder = await env.DB
    .prepare("SELECT order_id FROM paypal_credit_orders WHERE order_id = ?")
    .bind(orderId)
    .first<{ order_id: string }>();

  if (existingOrder) {
    const membership = await getStoredUserMembership(env, user);
    return { applied: false as const, membership, stored: true as const };
  }

  await env.DB
    .prepare("INSERT INTO paypal_credit_orders (order_id, email, hours) VALUES (?, ?, ?)")
    .bind(orderId, user.email, hours)
    .run();

  return addUserExtraCredits(env, user, hours);
}

export async function getUserStats(env: UserStoreEnv) {
  if (!env.DB) {
    return null;
  }

  await ensureUserStoreSchema(env);

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
         COALESCE(SUM(extra_credit_hours), 0) AS extra_credit_hours,
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
