import { Hono } from "hono";
import { clearCookie, getCookie, SESSION_COOKIE, STATE_COOKIE, setCookie } from "../lib/cookies";
import { addCreditsIdempotent } from "../lib/credits";
import { appOrigin, createId, nowIso } from "../lib/env";
import { fail, ok } from "../lib/response";
import {
  createSessionToken,
  createSignedToken,
  createStateToken,
  requireUser,
  verifyStateToken,
} from "../lib/session";
import type { HonoAppEnv, User } from "../types";

type Provider = "google";

type OAuthProfile = {
  provider: "google";
  providerId: string;
  email: string;
  name: string | null;
  avatar: string | null;
};

type UserProfile = OAuthProfile | {
  provider: "email" | "shipany";
  providerId: string;
  email: string;
  name: string | null;
  avatar: string | null;
};

const TRUSTED_RETURN_TO_ORIGINS = [
  "https://videotosrt-shipany.ewan0862.workers.dev",
] as const;
const SHIPANY_ORIGIN = TRUSTED_RETURN_TO_ORIGINS[0];
const SHIPANY_AUTH_COMPLETE_PATH = "/api/auth/videotosrt/complete";
const SHIPANY_HANDOFF_TTL_SECONDS = 60;

type ShipAnyCompletionTarget = {
  completionUrl: string;
  returnPath: string;
};

function trustedReturnToOrigins(env: HonoAppEnv["Bindings"]) {
  return new Set([new URL(appOrigin(env)).origin, ...TRUSTED_RETURN_TO_ORIGINS]);
}

function safeShipAnyReturnPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  try {
    const url = new URL(value, SHIPANY_ORIGIN);
    if (url.origin !== SHIPANY_ORIGIN || url.pathname.startsWith("/api/auth/")) return null;
    return `${url.pathname}${url.search}${url.hash}` || "/";
  } catch {
    return null;
  }
}

function parseShipAnyCompletionTarget(returnTo: string) {
  try {
    const url = new URL(returnTo);
    if (url.origin !== SHIPANY_ORIGIN || url.pathname !== SHIPANY_AUTH_COMPLETE_PATH) return null;
    if (url.username || url.password) return null;

    const returnPath = safeShipAnyReturnPath(url.searchParams.get("returnTo"));
    if (!returnPath) return null;

    const completionUrl = new URL(SHIPANY_AUTH_COMPLETE_PATH, SHIPANY_ORIGIN);
    completionUrl.searchParams.set("returnTo", returnPath);
    return { completionUrl: completionUrl.toString(), returnPath } satisfies ShipAnyCompletionTarget;
  } catch {
    return null;
  }
}

function safeReturnTo(env: HonoAppEnv["Bindings"], returnTo: string | null) {
  const fallback = appOrigin(env);
  if (!returnTo) return fallback;
  try {
    const url = new URL(returnTo, fallback);
    if (url.origin === SHIPANY_ORIGIN) {
      return parseShipAnyCompletionTarget(url.toString())?.completionUrl ?? fallback;
    }
    return trustedReturnToOrigins(env).has(url.origin) ? url.toString() : fallback;
  } catch {
    return fallback;
  }
}

async function createShipAnyHandoffToken(env: HonoAppEnv["Bindings"], profile: OAuthProfile, returnPath: string) {
  return createSignedToken(
    {
      iss: "videotosrt-backend",
      aud: SHIPANY_ORIGIN,
      provider: "google",
      providerId: profile.providerId,
      email: profile.email,
      name: profile.name,
      avatar: profile.avatar,
      returnTo: returnPath,
      nonce: crypto.randomUUID(),
      exp: Math.floor(Date.now() / 1000) + SHIPANY_HANDOFF_TTL_SECONDS,
    },
    env.SHIPANY_BRIDGE_SECRET,
  );
}

function redirectToShipAnyCompletion(target: ShipAnyCompletionTarget, token: string) {
  const redirectUrl = new URL(SHIPANY_AUTH_COMPLETE_PATH, SHIPANY_ORIGIN);
  redirectUrl.searchParams.set("returnTo", target.returnPath);
  redirectUrl.searchParams.set("token", token);
  return redirectUrl.toString();
}

function redirectWithFrontendSessionToken(env: HonoAppEnv["Bindings"], returnTo: string, token: string) {
  const url = new URL(returnTo);
  const appUrl = new URL(appOrigin(env));
  if (url.origin !== appUrl.origin || url.pathname !== "/auth/complete" || url.username || url.password) {
    return returnTo;
  }

  const fragment = new URLSearchParams(url.hash.slice(1));
  fragment.set("token", token);
  url.hash = fragment.toString();
  return url.toString();
}

async function upsertUser(env: HonoAppEnv["Bindings"], profile: UserProfile) {
  const existing = await env.DB.prepare("SELECT * FROM users WHERE provider = ? AND provider_id = ?")
    .bind(profile.provider, profile.providerId)
    .first<User>();

  const now = nowIso();
  if (existing) {
    await env.DB.prepare(
      `UPDATE users
       SET email = ?, name = ?, avatar = ?, updated_at = ?
       WHERE id = ?`,
    )
      .bind(profile.email, profile.name, profile.avatar, now, existing.id)
      .run();
    return { ...existing, email: profile.email, name: profile.name, avatar: profile.avatar, updated_at: now };
  }

  const id = createId("user");
  await env.DB.prepare(
    `INSERT INTO users (id, email, name, avatar, provider, provider_id, plan, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'free', ?, ?)`,
  )
    .bind(id, profile.email, profile.name, profile.avatar, profile.provider, profile.providerId, now, now)
    .run();

  return env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(id).first<User>() as Promise<User>;
}

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

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function fetchGoogleProfile(env: HonoAppEnv["Bindings"], code: string): Promise<OAuthProfile> {
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: env.GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code",
      code,
    }),
  });
  const token = await tokenResponse.json<{ access_token?: string; error?: string }>();
  if (!tokenResponse.ok || !token.access_token) throw new Error(token.error || "Google token exchange failed");

  const userResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  const user = await userResponse.json<{ id: string; email: string; name?: string; picture?: string }>();
  if (!userResponse.ok || !user.email) throw new Error("Google profile request failed");

  return {
    provider: "google",
    providerId: user.id,
    email: user.email,
    name: user.name ?? null,
    avatar: user.picture ?? null,
  };
}

export const authRoutes = new Hono<HonoAppEnv>();

authRoutes.post("/auth/shipany/bridge", async (c) => {
  const secret = c.env.SHIPANY_BRIDGE_SECRET;
  if (!secret) return fail(c, 500, "BRIDGE_NOT_CONFIGURED", "ShipAny bridge is not configured");

  const body = await c.req.json<{
    id?: string;
    email?: string;
    name?: string | null;
    avatar?: string | null;
    ts?: number;
    sig?: string;
  }>().catch(() => null);

  const email = body?.email?.trim().toLowerCase();
  const ts = body?.ts;
  const sig = body?.sig;
  if (!email || !ts || !sig) {
    return fail(c, 400, "INVALID_BRIDGE_PAYLOAD", "email, ts, and sig are required");
  }

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > 300) {
    return fail(c, 401, "BRIDGE_EXPIRED", "Bridge payload expired");
  }

  const id = body.id?.trim() || "";
  const expectedSig = await hmacHex(`${id}.${email}.${ts}`, secret);
  if (!constantTimeEqual(expectedSig, sig.toLowerCase())) {
    return fail(c, 401, "INVALID_BRIDGE_SIGNATURE", "Invalid bridge signature");
  }

  const user = await upsertUser(c.env, {
    provider: "shipany",
    providerId: id || email,
    email,
    name: body.name ?? null,
    avatar: body.avatar ?? null,
  });
  const token = await createSessionToken(c, user.id);

  return ok(c, { token, user });
});

authRoutes.post("/auth/shipany/grant-credits", async (c) => {
  const secret = c.env.SHIPANY_BRIDGE_SECRET;
  if (!secret) return fail(c, 500, "BRIDGE_NOT_CONFIGURED", "ShipAny bridge is not configured");

  const body = await c.req.json<{
    id?: string;
    email?: string;
    name?: string | null;
    avatar?: string | null;
    minutes?: number;
    amount?: number;
    reference?: string;
    orderNo?: string;
    subscriptionNo?: string;
    paymentType?: string;
    provider?: string;
    ts?: number;
    sig?: string;
  }>().catch(() => null);

  const email = body?.email?.trim().toLowerCase();
  const id = body?.id?.trim() || "";
  const minutes = Number.isFinite(body?.minutes) ? Math.trunc(body?.minutes ?? 0) : Math.trunc(body?.amount ?? 0);
  const reference = body?.reference?.trim() || "";
  const orderNo = body?.orderNo?.trim() || "";
  const subscriptionNo = body?.subscriptionNo?.trim() || "";
  const paymentType = body?.paymentType?.trim() || "";
  const provider = body?.provider?.trim() || "";
  const ts = body?.ts;
  const sig = body?.sig;

  if (!email || !ts || !sig || !reference || !Number.isSafeInteger(minutes) || minutes <= 0) {
    return fail(c, 400, "INVALID_CREDIT_GRANT_PAYLOAD", "email, ts, sig, reference, and positive minutes are required");
  }

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > 300) {
    return fail(c, 401, "BRIDGE_EXPIRED", "Bridge payload expired");
  }

  const signedValue = [id, email, String(minutes), reference, orderNo, subscriptionNo, paymentType, provider, String(ts)].join(".");
  const expectedSig = await hmacHex(signedValue, secret);
  if (!constantTimeEqual(expectedSig, sig.toLowerCase())) {
    return fail(c, 401, "INVALID_BRIDGE_SIGNATURE", "Invalid bridge signature");
  }

  const user = await upsertUser(c.env, {
    provider: "shipany",
    providerId: id || email,
    email,
    name: body.name ?? null,
    avatar: body.avatar ?? null,
  });

  const transactionId = `shipany_${(await sha256Hex(reference)).slice(0, 48)}`;
  const description = [
    "ShipAny credit sync",
    orderNo ? `order=${orderNo}` : "",
    subscriptionNo ? `subscription=${subscriptionNo}` : "",
    paymentType ? `type=${paymentType}` : "",
  ].filter(Boolean).join(" ");
  const result = await addCreditsIdempotent(c.env, user.id, minutes, description, transactionId);

  return ok(c, {
    user_id: user.id,
    minutes,
    reference,
    granted: result.granted,
    duplicate: result.duplicate,
  });
});

authRoutes.get("/auth/login", async (c) => {
  const provider = c.req.query("provider") as Provider | undefined;
  if (provider !== "google") {
    return fail(c, 400, "INVALID_PROVIDER", "provider must be google");
  }

  const returnTo = safeReturnTo(c.env, c.req.query("returnTo") ?? null);

  const state = await createStateToken(c.env, { provider, returnTo });
  setCookie(c, STATE_COOKIE, state, 600);

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.search = new URLSearchParams({
    client_id: c.env.GOOGLE_CLIENT_ID,
    redirect_uri: c.env.GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  }).toString();

  return c.redirect(authUrl.toString());
});

authRoutes.get("/auth/callback/:provider", async (c) => {
  const provider = c.req.param("provider") as Provider;

  if (provider !== "google") return fail(c, 404, "NOT_FOUND", "Auth callback not found");

  const state = c.req.query("state") ?? null;
  const stateCookie = getCookie(c, STATE_COOKIE);
  // OAuth callbacks may land on a different host than the login endpoint, so the state cookie can be absent.
  if (!state || (stateCookie && state !== stateCookie)) {
    return fail(c, 400, "INVALID_STATE", "OAuth state mismatch");
  }

  const verifiedState = await verifyStateToken(c.env, state, provider);
  if (!verifiedState) return fail(c, 400, "INVALID_STATE", "OAuth state is invalid or expired");

  const shipAnyTarget = parseShipAnyCompletionTarget(verifiedState.returnTo);
  let isShipAnyReturnTo = false;
  try {
    isShipAnyReturnTo = new URL(verifiedState.returnTo).origin === SHIPANY_ORIGIN;
  } catch {
    isShipAnyReturnTo = false;
  }
  if (isShipAnyReturnTo && !shipAnyTarget) {
    return fail(c, 400, "INVALID_RETURN_TO", "ShipAny OAuth returnTo is not allowed");
  }
  const code = c.req.query("code");
  if (!code) return fail(c, 400, "CODE_REQUIRED", "OAuth code is required");

  const profile = await fetchGoogleProfile(c.env, code);
  if (shipAnyTarget) {
    if (!c.env.SHIPANY_BRIDGE_SECRET) {
      return fail(c, 500, "BRIDGE_NOT_CONFIGURED", "ShipAny bridge is not configured");
    }
    clearCookie(c, STATE_COOKIE);
    const token = await createShipAnyHandoffToken(c.env, profile, shipAnyTarget.returnPath);
    return c.redirect(redirectToShipAnyCompletion(shipAnyTarget, token));
  }

  const user = await upsertUser(c.env, profile);
  clearCookie(c, STATE_COOKIE);
  const token = await createSessionToken(c, user.id);
  setCookie(c, SESSION_COOKIE, token);

  return c.redirect(redirectWithFrontendSessionToken(c.env, verifiedState.returnTo, token));
});

authRoutes.get("/auth/me", (c) => {
  const user = requireUser(c);
  if (!user) return ok(c, { user: null });
  return ok(c, { user });
});

authRoutes.post("/auth/logout", (c) => {
  clearCookie(c, SESSION_COOKIE);
  return ok(c, { logged_out: true });
});
