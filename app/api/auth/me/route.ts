import { getCloudflareContext } from "@opennextjs/cloudflare";
import { readLocalAuthUser, type LocalAuthUser } from "@/lib/local-auth";
import { jsonResponse } from "@/lib/paypal";
import { getStoredUserMembership, upsertUserLogin, type UserStoreEnv } from "@/lib/user-store";
import type { ApiUser, ApiUserResponse } from "@/lib/api";

const UPSTREAM_API_BASE = "https://api.videotosrt.org/api";

function filterProxyRequestHeaders(headers: Headers) {
  const nextHeaders = new Headers(headers);
  nextHeaders.delete("host");
  nextHeaders.delete("origin");
  nextHeaders.delete("referer");
  nextHeaders.delete("content-length");
  return nextHeaders;
}

function normalizeApiUser(data: ApiUserResponse): ApiUser | null {
  if (!data) {
    return null;
  }

  if (typeof data === "object" && ("user" in data || "data" in data)) {
    return data.user ?? data.data?.user ?? null;
  }

  return data as ApiUser;
}

function toStoreUser(user: {
  display_name?: string;
  email?: string;
  full_name?: string;
  id?: string;
  name?: string;
  username?: string;
} | null): LocalAuthUser | null {
  if (!user?.email) {
    return null;
  }

  return {
    email: user.email,
    id: user.id ?? `email:${user.email.toLowerCase()}`,
    name: user.name ?? user.username ?? user.display_name ?? user.full_name ?? user.email.split("@")[0] ?? "VideoToSRT user"
  };
}

export async function GET(request: Request) {
  const localUser = readLocalAuthUser(request);
  if (localUser) {
    const env = (await getCloudflareContext({ async: true })).env as UserStoreEnv;
    await upsertUserLogin(env, localUser);
    const membership = await getStoredUserMembership(env, localUser);
    const user = membership
      ? { ...localUser, extra_credit_hours: membership.extra_credit_hours, plan: membership.plan }
      : localUser;

    return jsonResponse({ data: { user }, user });
  }

  const upstreamResponse = await fetch(`${UPSTREAM_API_BASE}/auth/me`, {
    headers: filterProxyRequestHeaders(request.headers),
    method: "GET"
  });

  if (!upstreamResponse.ok) {
    return jsonResponse({ message: "Not signed in." }, { status: 401 });
  }

  const upstreamData = await upstreamResponse.json() as ApiUserResponse;
  const upstreamUser = normalizeApiUser(upstreamData);
  const storeUser = toStoreUser(upstreamUser);

  if (!storeUser) {
    return jsonResponse(upstreamData);
  }

  const env = (await getCloudflareContext({ async: true })).env as UserStoreEnv;
  await upsertUserLogin(env, storeUser, "oauth");
  const membership = await getStoredUserMembership(env, storeUser);
  const user = membership
    ? { ...upstreamUser, extra_credit_hours: membership.extra_credit_hours, plan: membership.plan }
    : upstreamUser;

  return jsonResponse({ data: { user }, user });
}
