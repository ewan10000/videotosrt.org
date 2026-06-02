import { Hono } from "hono";
import { clearCookie, getCookie, SESSION_COOKIE, STATE_COOKIE, setCookie } from "../lib/cookies";
import { appOrigin, createId, nowIso } from "../lib/env";
import { fail, ok } from "../lib/response";
import {
  createSessionCookie,
  createSignedToken,
  createStateToken,
  requireUser,
  verifySignedToken,
  verifyStateToken,
} from "../lib/session";
import type { HonoAppEnv, User } from "../types";

type Provider = "google" | "github" | "email";

type OAuthProfile = {
  provider: "google" | "github";
  providerId: string;
  email: string;
  name: string | null;
  avatar: string | null;
};

function safeReturnTo(env: HonoAppEnv["Bindings"], returnTo: string | null) {
  const fallback = appOrigin(env);
  if (!returnTo) return fallback;
  try {
    const url = new URL(returnTo, fallback);
    const app = new URL(fallback);
    return url.origin === app.origin ? url.toString() : fallback;
  } catch {
    return fallback;
  }
}

async function upsertUser(env: HonoAppEnv["Bindings"], profile: OAuthProfile | {
  provider: "email";
  providerId: string;
  email: string;
  name: string | null;
  avatar: string | null;
}) {
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
    `INSERT INTO users (id, email, name, avatar, provider, provider_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(id, profile.email, profile.name, profile.avatar, profile.provider, profile.providerId, now, now)
    .run();

  return env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(id).first<User>() as Promise<User>;
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

async function fetchGithubProfile(env: HonoAppEnv["Bindings"], code: string): Promise<OAuthProfile> {
  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      redirect_uri: env.GITHUB_REDIRECT_URI,
      code,
    }),
  });
  const token = await tokenResponse.json<{ access_token?: string; error?: string }>();
  if (!tokenResponse.ok || !token.access_token) throw new Error(token.error || "GitHub token exchange failed");

  const [profileResponse, emailsResponse] = await Promise.all([
    fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${token.access_token}`, "User-Agent": "VideoToSRT" },
    }),
    fetch("https://api.github.com/user/emails", {
      headers: { Authorization: `Bearer ${token.access_token}`, "User-Agent": "VideoToSRT" },
    }),
  ]);

  const profile = await profileResponse.json<{ id: number; name?: string; login: string; avatar_url?: string }>();
  const emails = await emailsResponse.json<Array<{ email: string; primary: boolean; verified: boolean }>>();
  const email = emails.find((item) => item.primary && item.verified)?.email ?? emails.find((item) => item.verified)?.email;
  if (!profileResponse.ok || !emailsResponse.ok || !email) throw new Error("GitHub profile request failed");

  return {
    provider: "github",
    providerId: String(profile.id),
    email,
    name: profile.name ?? profile.login,
    avatar: profile.avatar_url ?? null,
  };
}

export const authRoutes = new Hono<HonoAppEnv>();

authRoutes.get("/auth/login", async (c) => {
  const provider = c.req.query("provider") as Provider | undefined;
  if (!provider || !["google", "github", "email"].includes(provider)) {
    return fail(c, 400, "INVALID_PROVIDER", "provider must be google, github, or email");
  }

  const returnTo = safeReturnTo(c.env, c.req.query("returnTo") ?? null);

  if (provider === "email") {
    const email = c.req.query("email");
    if (!email) return fail(c, 400, "EMAIL_REQUIRED", "email query parameter is required for email login");
    const token = await createSignedToken(
      { provider: "email", email, returnTo, exp: Math.floor(Date.now() / 1000) + 900 },
      c.env.SESSION_SECRET,
    );
    return ok(c, {
      message: "Email delivery is not configured; use magic_link to complete login.",
      magic_link: `${appOrigin(c.env)}/api/auth/callback/email?token=${encodeURIComponent(token)}`,
    });
  }

  const state = await createStateToken(c.env, { provider, returnTo });
  setCookie(c, STATE_COOKIE, state, 600);

  const authUrl =
    provider === "google"
      ? new URL("https://accounts.google.com/o/oauth2/v2/auth")
      : new URL("https://github.com/login/oauth/authorize");

  if (provider === "google") {
    authUrl.search = new URLSearchParams({
      client_id: c.env.GOOGLE_CLIENT_ID,
      redirect_uri: c.env.GOOGLE_REDIRECT_URI,
      response_type: "code",
      scope: "openid email profile",
      state,
      prompt: "select_account",
    }).toString();
  } else {
    authUrl.search = new URLSearchParams({
      client_id: c.env.GITHUB_CLIENT_ID,
      redirect_uri: c.env.GITHUB_REDIRECT_URI,
      scope: "read:user user:email",
      state,
    }).toString();
  }

  return c.redirect(authUrl.toString());
});

authRoutes.get("/auth/callback/:provider", async (c) => {
  const provider = c.req.param("provider") as Provider;

  if (provider === "email") {
    const token = await verifySignedToken<{
      provider: "email";
      email: string;
      returnTo: string;
      exp: number;
    }>(c.req.query("token") ?? null, c.env.SESSION_SECRET);
    if (!token || token.provider !== "email" || token.exp < Math.floor(Date.now() / 1000)) {
      return fail(c, 400, "INVALID_TOKEN", "Invalid or expired email login token");
    }

    const user = await upsertUser(c.env, {
      provider: "email",
      providerId: token.email.toLowerCase(),
      email: token.email.toLowerCase(),
      name: null,
      avatar: null,
    });
    await createSessionCookie(c, user.id);
    return c.redirect(safeReturnTo(c.env, token.returnTo));
  }

  if (!["google", "github"].includes(provider)) return fail(c, 404, "NOT_FOUND", "Auth callback not found");

  const state = c.req.query("state") ?? null;
  if (!state || state !== getCookie(c, STATE_COOKIE)) {
    return fail(c, 400, "INVALID_STATE", "OAuth state mismatch");
  }

  const verifiedState = await verifyStateToken(c.env, state, provider);
  if (!verifiedState) return fail(c, 400, "INVALID_STATE", "OAuth state is invalid or expired");

  const code = c.req.query("code");
  if (!code) return fail(c, 400, "CODE_REQUIRED", "OAuth code is required");

  const profile = provider === "google" ? await fetchGoogleProfile(c.env, code) : await fetchGithubProfile(c.env, code);
  const user = await upsertUser(c.env, profile);
  clearCookie(c, STATE_COOKIE);
  await createSessionCookie(c, user.id);

  return c.redirect(verifiedState.returnTo);
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
