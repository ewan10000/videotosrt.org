export const LOCAL_AUTH_COOKIE = "videotosrt_email_session";

export type LocalAuthUser = {
  email: string;
  id: string;
  name: string;
};

function base64UrlEncode(value: string) {
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return atob(padded);
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function userFromEmail(email: string): LocalAuthUser {
  const normalizedEmail = normalizeEmail(email);
  return {
    email: normalizedEmail,
    id: `email:${normalizedEmail}`,
    name: normalizedEmail.split("@")[0] || "VideoToSRT user"
  };
}

export function createLocalAuthToken(user: LocalAuthUser) {
  return base64UrlEncode(JSON.stringify({
    email: user.email,
    id: user.id,
    name: user.name,
    provider: "email",
    version: 1
  }));
}

export function readLocalAuthUser(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  const token = cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${LOCAL_AUTH_COOKIE}=`))
    ?.slice(LOCAL_AUTH_COOKIE.length + 1);

  if (!token) {
    return null;
  }

  try {
    const data = JSON.parse(base64UrlDecode(token)) as Partial<LocalAuthUser> & { provider?: string };
    if (!data.email || !isValidEmail(data.email)) {
      return null;
    }

    return userFromEmail(data.email);
  } catch {
    return null;
  }
}

export function localAuthCookieHeader(user: LocalAuthUser) {
  return `${LOCAL_AUTH_COOKIE}=${createLocalAuthToken(user)}; Path=/; Max-Age=2592000; SameSite=Lax; Secure; HttpOnly`;
}

export function clearLocalAuthCookieHeader() {
  return `${LOCAL_AUTH_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax; Secure; HttpOnly`;
}
