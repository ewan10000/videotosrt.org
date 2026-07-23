import { NextResponse, type NextRequest } from "next/server";

const API_PROXY_PREFIX = "/api";
const UPSTREAM_API_BASE = "https://api.videotosrt.org/api";
const securityHeaders = {
  "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.paypal.com https://www.sandbox.paypal.com https://www.paypalobjects.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://www.paypalobjects.com; font-src 'self' data:; connect-src 'self' https://api.videotosrt.org https://videotosrt-backend.ewan0862.workers.dev https://api-m.sandbox.paypal.com https://api-m.paypal.com; media-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://www.paypal.com https://www.sandbox.paypal.com",
  "X-Frame-Options": "DENY"
};
const LOCAL_API_ROUTES = new Set([
  "/api/admin/users",
  "/api/auth/logout",
  "/api/auth/me",
  "/api/auth/oauth/bridge",
  "/api/auth/session/complete",
  "/api/checkout/paypal",
  "/api/checkout/paypal/credits",
  "/api/checkout/paypal/credits/capture",
  "/api/checkout/paypal/sync",
  "/api/events",
  "/api/webhooks/paypal"
]);

function filterProxyRequestHeaders(headers: Headers) {
  const nextHeaders = new Headers(headers);

  nextHeaders.delete("host");
  nextHeaders.delete("origin");
  nextHeaders.delete("referer");
  nextHeaders.delete("content-length");

  return nextHeaders;
}

function filterProxyResponseHeaders(headers: Headers) {
  const nextHeaders = new Headers(headers);

  nextHeaders.delete("content-encoding");
  nextHeaders.delete("content-length");
  nextHeaders.delete("transfer-encoding");
  nextHeaders.delete("access-control-allow-origin");
  nextHeaders.delete("access-control-allow-credentials");
  nextHeaders.delete("access-control-allow-methods");
  nextHeaders.delete("access-control-allow-headers");

  return nextHeaders;
}

function withSecurityHeaders<T extends Response>(response: T) {
  for (const [key, value] of Object.entries(securityHeaders)) {
    response.headers.set(key, value);
  }

  return response;
}

async function proxyApi(request: NextRequest) {
  const upstreamUrl = new URL(`${UPSTREAM_API_BASE}${request.nextUrl.pathname.slice(API_PROXY_PREFIX.length)}`);
  upstreamUrl.search = request.nextUrl.search;

  const method = request.method.toUpperCase();
  const upstreamResponse = await fetch(upstreamUrl, {
    body: method === "GET" || method === "HEAD" ? undefined : request.body,
    headers: filterProxyRequestHeaders(request.headers),
    method,
    redirect: "manual"
  });

  return withSecurityHeaders(new Response(upstreamResponse.body, {
    headers: filterProxyResponseHeaders(upstreamResponse.headers),
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText
  }));
}

export function middleware(request: NextRequest) {
  if (LOCAL_API_ROUTES.has(request.nextUrl.pathname)) {
    return withSecurityHeaders(NextResponse.next());
  }

  if (request.nextUrl.pathname.startsWith(`${API_PROXY_PREFIX}/`)) {
    return proxyApi(request);
  }

  if (request.nextUrl.hostname === "www.videotosrt.org") {
    const url = request.nextUrl.clone();
    url.hostname = "videotosrt.org";
    url.protocol = "https:";
    return withSecurityHeaders(NextResponse.redirect(url, 301));
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|favicon-16x16.png|favicon-32x32.png|apple-touch-icon.png|og-image.png).*)"]
};
