import { readLocalAuthUser } from "@/lib/local-auth";
import { jsonResponse } from "@/lib/paypal";

const UPSTREAM_API_BASE = "https://api.videotosrt.org/api";

function filterProxyRequestHeaders(headers: Headers) {
  const nextHeaders = new Headers(headers);
  nextHeaders.delete("host");
  nextHeaders.delete("origin");
  nextHeaders.delete("referer");
  nextHeaders.delete("content-length");
  return nextHeaders;
}

export async function GET(request: Request) {
  const localUser = readLocalAuthUser(request);
  if (localUser) {
    return jsonResponse({ data: { user: localUser }, user: localUser });
  }

  const upstreamResponse = await fetch(`${UPSTREAM_API_BASE}/auth/me`, {
    headers: filterProxyRequestHeaders(request.headers),
    method: "GET"
  });

  if (!upstreamResponse.ok) {
    return jsonResponse({ message: "Not signed in." }, { status: 401 });
  }

  return jsonResponse(await upstreamResponse.json());
}
