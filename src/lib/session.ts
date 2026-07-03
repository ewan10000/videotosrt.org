import type { Context, MiddlewareHandler } from "hono";
import { getCookie, SESSION_COOKIE, setCookie } from "./cookies";
import type { Bindings, HonoAppEnv, User } from "../types";

type SessionPayload = {
  userId: string;
  exp: number;
};

type StatePayload = {
  provider: "google" | "github" | "email";
  returnTo: string;
  exp: number;
};

const encoder = new TextEncoder();

function base64Url(input: ArrayBuffer | Uint8Array | string) {
  const bytes =
    typeof input === "string" ? encoder.encode(input) : input instanceof Uint8Array ? input : new Uint8Array(input);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function fromBase64Url(value: string) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmacKey(secret: string) {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

async function signValue(value: string, secret: string) {
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return base64Url(sig);
}

export async function createSignedToken(payload: unknown, secret: string) {
  const body = base64Url(JSON.stringify(payload));
  const sig = await signValue(body, secret);
  return `${body}.${sig}`;
}

export async function verifySignedToken<T>(token: string | null, secret: string): Promise<T | null> {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expected = await signValue(body, secret);
  if (expected !== sig) return null;

  try {
    return JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as T;
  } catch {
    return null;
  }
}

export async function createSessionToken(c: Context, userId: string) {
  const payload: SessionPayload = {
    userId,
    exp: Math.floor(Date.now() / 1000) + 604800,
  };
  return createSignedToken(payload, c.env.SESSION_SECRET);
}

export async function createSessionCookie(c: Context, userId: string) {
  setCookie(c, SESSION_COOKIE, await createSessionToken(c, userId));
}

export async function createStateToken(env: Bindings, payload: Omit<StatePayload, "exp">) {
  return createSignedToken({ ...payload, exp: Math.floor(Date.now() / 1000) + 600 }, env.SESSION_SECRET);
}

export async function verifyStateToken(env: Bindings, token: string | null, provider: StatePayload["provider"]) {
  const payload = await verifySignedToken<StatePayload>(token, env.SESSION_SECRET);
  if (!payload || payload.exp < Math.floor(Date.now() / 1000) || payload.provider !== provider) return null;
  return payload;
}

export async function getSessionUser(c: Context<HonoAppEnv>) {
  const payload = await verifySignedToken<SessionPayload>(getCookie(c, SESSION_COOKIE), c.env.SESSION_SECRET);
  if (!payload || payload.exp < Math.floor(Date.now() / 1000)) return null;

  return c.env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(payload.userId).first<User>();
}

export const loadUser: MiddlewareHandler<HonoAppEnv> = async (c, next) => {
  c.set("user", await getSessionUser(c));
  await next();
};

export function requireUser(c: Context<HonoAppEnv>) {
  const user = c.get("user");
  return user ?? null;
}
