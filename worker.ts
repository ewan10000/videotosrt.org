// @ts-expect-error OpenNext generates this worker during the Cloudflare build.
import openNextWorker from "./.open-next/worker.js";

const API_PROXY_PREFIX = "/api";
const UPSTREAM_API_BASE = "https://api.videotosrt.org/api";

type Env = {
  DB?: D1DatabaseLike;
  PAYPAL_CLIENT_ID?: string;
  PAYPAL_CLIENT_SECRET?: string;
  PAYPAL_ENVIRONMENT?: "live" | "sandbox";
  PAYPAL_WEBHOOK_ID?: string;
  PAYPAL_PRO_MONTHLY_PLAN_ID?: string;
  PAYPAL_STUDIO_MONTHLY_PLAN_ID?: string;
  PAYPAL_WEBHOOK_FORWARD_URL?: string;
};

type D1DatabaseLike = {
  prepare(query: string): D1PreparedStatementLike;
};

type D1PreparedStatementLike = {
  all<T = unknown>(): Promise<{ results?: T[] }>;
  bind(...values: unknown[]): D1PreparedStatementLike;
  first<T = unknown>(): Promise<T | null>;
  run(): Promise<unknown>;
};

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

function withStaticAssetCaching(request: Request, response: Response) {
  const url = new URL(request.url);
  if (url.pathname.startsWith("/_next/static/")) {
    const nextResponse = new Response(response.body, response);
    nextResponse.headers.set("Cache-Control", "public, max-age=31536000, immutable");
    return nextResponse;
  }

  return response;
}

async function proxyApi(request: Request) {
  const requestUrl = new URL(request.url);
  const upstreamUrl = new URL(`${UPSTREAM_API_BASE}${requestUrl.pathname.slice(API_PROXY_PREFIX.length)}`);
  upstreamUrl.search = requestUrl.search;

  const method = request.method.toUpperCase();
  const headers = filterProxyRequestHeaders(request.headers);
  const body = method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer();

  if (body) {
    headers.set("content-length", String(body.byteLength));
  }

  const upstreamResponse = await fetch(upstreamUrl, {
    body,
    headers,
    method,
    redirect: "manual"
  });

  return new Response(upstreamResponse.body, {
    headers: filterProxyResponseHeaders(upstreamResponse.headers),
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText
  });
}

export default {
  async fetch(request: Request, env: Env, ctx: unknown) {
    const url = new URL(request.url);

    if (
      url.pathname === "/api/checkout" ||
      url.pathname === "/api/paypal/webhook" ||
      url.pathname === "/api/checkout/stripe" ||
      url.pathname === "/api/checkout/stripe/credits" ||
      url.pathname === "/api/billing/portal" ||
      url.pathname === "/api/webhooks/stripe" ||
      url.pathname === "/api/admin/users" ||
      url.pathname === "/api/auth/logout" ||
      url.pathname === "/api/auth/me" ||
      url.pathname === "/api/auth/oauth/bridge" ||
      url.pathname === "/api/auth/session/complete" ||
      url.pathname === "/api/auth/login" ||
      url.pathname === "/api/checkout/paypal" ||
      url.pathname === "/api/checkout/paypal/credits" ||
      url.pathname === "/api/checkout/paypal/credits/capture" ||
      url.pathname === "/api/checkout/paypal/sync" ||
      url.pathname === "/api/events" ||
      url.pathname === "/api/webhooks/paypal"
    ) {
      return withStaticAssetCaching(request, await openNextWorker.fetch(request, env, ctx));
    }

    if (url.pathname.startsWith(`${API_PROXY_PREFIX}/`)) {
      return proxyApi(request);
    }

    return withStaticAssetCaching(request, await openNextWorker.fetch(request, env, ctx));
  }
};
