import { readLocalAuthUser } from "@/lib/local-auth";
import { jsonResponse } from "@/lib/paypal";
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

export async function GET(request: Request) {
  const localUser = readLocalAuthUser(request);
  if (localUser && !request.headers.get("authorization") && !/(?:^|;\s*)vts_session=/.test(request.headers.get("cookie") ?? "")) {
    const user = { ...localUser, plan: "free", extra_credit_hours: 0 };
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
  return jsonResponse({ data: { user: upstreamUser }, user: upstreamUser });
}
