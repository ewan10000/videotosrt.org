import { isValidEmail, localAuthCookieHeader, normalizeEmail, userFromEmail, type LocalAuthUser } from "@/lib/local-auth";
import { jsonResponse, readJson } from "@/lib/paypal";
import type { ApiUser, ApiUserResponse } from "@/lib/api";

const UPSTREAM_API_BASE = "https://api.videotosrt.org/api";
const UPSTREAM_SESSION_COOKIE = "vts_session";
const UPSTREAM_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

type CompletePayload = {
  token?: string;
  handoff?: string;
};

function normalizeApiUser(data: ApiUserResponse): ApiUser | null {
  if (!data) {
    return null;
  }

  if (typeof data === "object" && ("user" in data || "data" in data)) {
    return data.user ?? data.data?.user ?? null;
  }

  return data as ApiUser;
}

function toLocalAuthUser(user: ApiUser | null): LocalAuthUser | null {
  const email = normalizeEmail(user?.email ?? "");
  if (!isValidEmail(email)) {
    return null;
  }

  const localUser = userFromEmail(email);

  return {
    ...localUser,
    id: user?.id ?? localUser.id,
    name: user?.name ?? user?.username ?? user?.display_name ?? user?.full_name ?? localUser.name
  };
}

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin || request.headers.get("sec-fetch-site") === "cross-site") {
    return jsonResponse({ message: "Invalid session completion origin." }, { status: 403 });
  }
  const payload = await readJson<CompletePayload>(request);
  let token = typeof payload?.token === "string" ? payload.token.trim() : "";
  const handoff = typeof payload?.handoff === "string" ? payload.handoff : "";
  if (handoff) {
    const verifier = request.headers.get("cookie")?.split(";").map(p=>p.trim()).find(p=>p.startsWith("__Host-vts_oauth_verifier="))?.split("=")[1];
    if (!verifier || !/^[a-f0-9]{64}$/.test(verifier)) return jsonResponse({message:"Sign-in browser binding missing. Please try again."},{status:403});
    const exchangeHeaders = new Headers({"Content-Type":"application/json"});
    const sessionCookie = request.headers.get("cookie")?.split(";").map(p=>p.trim()).find(p=>p.startsWith("vts_session="));
    if (sessionCookie) exchangeHeaders.set("Cookie",sessionCookie);
    const response = await fetch(`${UPSTREAM_API_BASE}/auth/handoff/exchange`,{method:"POST",headers:exchangeHeaders,body:JSON.stringify({token:handoff,verifier}),redirect:"manual",cache:"no-store"});
    if (!response.ok) return jsonResponse({message:"Sign-in handoff rejected. Please sign out before switching accounts, or try again."},{status:response.status >= 400 && response.status < 500 ? response.status : 401});
    const result = await response.json() as {data?:{token?:string;user?:ApiUser}};
    token = result.data?.token ?? "";
    const user = result.data?.user ?? null;
    const localUser = toLocalAuthUser(user);
    if (!token || !localUser) return jsonResponse({message:"Invalid sign-in account."},{status:401});
    const headers = new Headers({"Cache-Control":"no-store"});
    headers.append("Set-Cookie",localAuthCookieHeader(localUser));
    headers.append("Set-Cookie",`${UPSTREAM_SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${UPSTREAM_SESSION_MAX_AGE_SECONDS}; SameSite=Lax; Secure; HttpOnly`);
    headers.append("Set-Cookie","__Host-vts_oauth_verifier=; Path=/; Max-Age=0; SameSite=Lax; Secure; HttpOnly");
    return jsonResponse({data:{user},user},{headers});
  }

  if (!token) {
    return jsonResponse({ message: "Missing session token." }, { status: 400 });
  }

  // A URL token alone cannot prove this browser initiated sign-in. Fail closed
  // until a one-time, browser-bound cross-host handoff is implemented.
  const existingSession = request.headers.get("cookie")?.split(";").map(part => part.trim()).find(part => part.startsWith("vts_session="))?.slice("vts_session=".length);
  if (!existingSession || existingSession !== encodeURIComponent(token)) {
    return jsonResponse({ message: "Browser-bound sign-in handoff required. Please contact support." }, { status: 403 });
  }

  const upstreamResponse = await fetch(`${UPSTREAM_API_BASE}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`
    },
    method: "GET",
    redirect: "manual",
    cache: "no-store"
  });

  if (!upstreamResponse.ok) {
    return jsonResponse({ message: "Could not confirm the signed-in account." }, { status: 401 });
  }

  const upstreamData = await upstreamResponse.json() as ApiUserResponse;
  const upstreamUser = normalizeApiUser(upstreamData);
  const localUser = toLocalAuthUser(upstreamUser);

  if (!localUser) {
    return jsonResponse({ message: "The signed-in account did not include an email address." }, { status: 400 });
  }

  const user = upstreamUser;
  const headers = new Headers();

  headers.append("Set-Cookie", localAuthCookieHeader(localUser));
  headers.append(
    "Set-Cookie",
    `${UPSTREAM_SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${UPSTREAM_SESSION_MAX_AGE_SECONDS}; SameSite=Lax; Secure; HttpOnly`
  );

  return jsonResponse(
    { data: { user }, user },
    { headers }
  );
}
