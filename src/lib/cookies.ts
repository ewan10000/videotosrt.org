import type { Context } from "hono";

export const SESSION_COOKIE = "vts_session";
export const STATE_COOKIE = "vts_oauth_state";

export function getCookie(c: Context, name: string) {
  const cookie = c.req.header("Cookie");
  if (!cookie) return null;

  for (const part of cookie.split(";")) {
    const [rawKey, ...valueParts] = part.trim().split("=");
    if (rawKey === name) return decodeURIComponent(valueParts.join("="));
  }

  return null;
}

export function setCookie(c: Context, name: string, value: string, maxAge = 604800) {
  c.header(
    "Set-Cookie",
    `${name}=${encodeURIComponent(value)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`,
    { append: true },
  );
}

export function clearCookie(c: Context, name: string) {
  c.header(
    "Set-Cookie",
    `${name}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`,
    { append: true },
  );
}
