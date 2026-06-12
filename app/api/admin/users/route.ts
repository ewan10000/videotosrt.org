import { getCloudflareContext } from "@opennextjs/cloudflare";
import { jsonResponse } from "@/lib/paypal";
import { getUserStats, type UserStoreEnv } from "@/lib/user-store";

function getBearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
}

export async function GET(request: Request) {
  const env = (await getCloudflareContext({ async: true })).env as UserStoreEnv;

  if (!env.ADMIN_USERS_TOKEN) {
    return jsonResponse({ message: "Admin users token is not configured." }, { status: 503 });
  }

  if (getBearerToken(request) !== env.ADMIN_USERS_TOKEN) {
    return jsonResponse({ message: "Unauthorized." }, { status: 401 });
  }

  const stats = await getUserStats(env);
  if (!stats) {
    return jsonResponse({ message: "User database is not configured." }, { status: 503 });
  }

  return jsonResponse(stats);
}
