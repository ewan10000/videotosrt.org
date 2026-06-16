import { getCloudflareContext } from "@opennextjs/cloudflare";
import { localAuthCookieHeader, normalizeEmail, userFromEmail, type LocalAuthUser } from "@/lib/local-auth";
import { jsonResponse, readJson } from "@/lib/paypal";
import { getStoredUserMembership, upsertUserLogin, type UserStoreEnv } from "@/lib/user-store";
import type { ApiUser } from "@/lib/api";

function toLocalAuthUser(user: ApiUser | null): LocalAuthUser | null {
  const email = normalizeEmail(user?.email ?? "");
  if (!email) {
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
  const upstreamUser = await readJson<ApiUser>(request);
  const localUser = toLocalAuthUser(upstreamUser);

  if (!localUser) {
    return jsonResponse({ message: "Could not read the signed-in account." }, { status: 400 });
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
