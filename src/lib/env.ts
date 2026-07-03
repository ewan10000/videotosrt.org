import type { Bindings } from "../types";

const REQUIRED_SECRETS = [
  "SESSION_SECRET",
  "GROQ_API_KEY",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "CREEM_API_KEY",
  "CREEM_WEBHOOK_SECRET",
] as const;

export function assertEnv(env: Bindings) {
  for (const key of REQUIRED_SECRETS) {
    if (!env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
}

export function appOrigin(env: Bindings) {
  return env.APP_ORIGIN || "http://localhost:8787";
}

export function currentMonth(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;
}
