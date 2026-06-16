import { getCloudflareContext } from "@opennextjs/cloudflare";
import { isValidEmail, localAuthCookieHeader, normalizeEmail, userFromEmail, type LocalAuthUser } from "@/lib/local-auth";
import { jsonResponse, readJson } from "@/lib/paypal";
import { getStoredUserMembership, upsertUserLogin, type UserStoreEnv } from "@/lib/user-store";
import type { ApiUser, ApiUserResponse } from "@/lib/api";

const UPSTREAM_API_BASE = "https://api.videotosrt.org/api";

type CompletePayload = {
  token?: string;
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
  const payload = await readJson<CompletePayload>(request);
  const token = payload?.token?.trim();

  if (!token) {
    return jsonResponse({ message: "Missing session token." }, { status: 400 });
  }

  const upstreamResponse = await fetch(`${UPSTREAM_API_BASE}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`
    },
    method: "GET"
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

  const env = (await getCloudflareContext({ async: true })).env as UserStoreEnv;
  await upsertUserLogin(env, localUser, "oauth");
  const membership = await getStoredUserMembership(env, localUser);
  const user = membership
    ? { ...upstreamUser, email: localUser.email, extra_credit_hours: membership.extra_credit_hours, plan: membership.plan }
    : { ...upstreamUser, email: localUser.email };

  return jsonResponse(
    { data: { user }, user },
    {
      headers: {
        "Set-Cookie": localAuthCookieHeader(localUser)
      }
    }
  );
}
