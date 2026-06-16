// @ts-expect-error OpenNext generates this worker during the Cloudflare build.
import openNextWorker from "./.open-next/worker.js";

const API_PROXY_PREFIX = "/api";
const UPSTREAM_API_BASE = "https://api.videotosrt.org/api";
const SITE_URL = "https://videotosrt.org";

type Env = {
  PAYPAL_CLIENT_ID?: string;
  PAYPAL_CLIENT_SECRET?: string;
  PAYPAL_ENVIRONMENT?: "live" | "sandbox";
  PAYPAL_WEBHOOK_ID?: string;
  PAYPAL_PRO_MONTHLY_PLAN_ID?: string;
  PAYPAL_STUDIO_MONTHLY_PLAN_ID?: string;
  PAYPAL_WEBHOOK_FORWARD_URL?: string;
};

type CheckoutRequest = {
  billing?: "monthly" | "annual";
  plan?: "pro" | "business" | "studio";
};

type ApiUser = {
  id?: string;
  email?: string;
  name?: string;
  username?: string;
  display_name?: string;
  full_name?: string;
};

type ApiUserResponse =
  | ApiUser
  | {
      data?: {
        user?: ApiUser | null;
      } | null;
      user?: ApiUser | null;
    }
  | null;

type PaypalLink = {
  href?: string;
  rel?: string;
};

type PaypalSubscriptionResponse = {
  id?: string;
  links?: PaypalLink[];
};

function paypalApiBase(env: Env) {
  return env.PAYPAL_ENVIRONMENT === "sandbox" ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";
}

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

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");

  return new Response(JSON.stringify(body), {
    ...init,
    headers
  });
}

function normalizeUser(data: ApiUserResponse): ApiUser | null {
  if (!data) {
    return null;
  }

  const value = data as ApiUser & { data?: { user?: ApiUser | null } | null; user?: ApiUser | null };
  if (value.user || value.data) {
    return value.user ?? value.data?.user ?? null;
  }

  return value;
}

function userLabel(user: ApiUser) {
  return user.email ?? user.name ?? user.username ?? user.display_name ?? user.full_name ?? "VideoToSRT user";
}

async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return await request.json() as T;
  } catch {
    return null;
  }
}

async function getPaypalAccessToken(env: Env) {
  if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) {
    throw new Error("PayPal credentials are not configured.");
  }

  const response = await fetch(`${paypalApiBase(env)}/v1/oauth2/token`, {
    body: "grant_type=client_credentials",
    headers: {
      Authorization: `Basic ${btoa(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`)}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    method: "POST"
  });

  const data = await response.json() as { access_token?: string; error?: string; error_description?: string };

  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description ?? data.error ?? "Could not authenticate with PayPal.");
  }

  return data.access_token;
}

async function getCurrentUser(request: Request) {
  const response = await fetch(`${UPSTREAM_API_BASE}/auth/me`, {
    headers: filterProxyRequestHeaders(request.headers),
    method: "GET"
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json() as ApiUserResponse;
  return normalizeUser(data);
}

function getPlanId(env: Env, payload: CheckoutRequest) {
  if (payload.billing && payload.billing !== "monthly") {
    throw new Error("PayPal checkout currently supports monthly plans only.");
  }

  if (payload.plan === "pro") {
    return { id: env.PAYPAL_PRO_MONTHLY_PLAN_ID, name: "pro" };
  }

  if (payload.plan === "business" || payload.plan === "studio") {
    return { id: env.PAYPAL_STUDIO_MONTHLY_PLAN_ID, name: "studio" };
  }

  throw new Error("Unknown plan selected.");
}

async function createPaypalCheckout(request: Request, env: Env) {
  if (request.method.toUpperCase() !== "POST") {
    return jsonResponse({ message: "Method not allowed." }, { status: 405 });
  }

  const payload = await readJson<CheckoutRequest>(request);
  if (!payload) {
    return jsonResponse({ message: "Invalid checkout request." }, { status: 400 });
  }

  let plan: { id?: string; name: string };
  try {
    plan = getPlanId(env, payload);
  } catch (error) {
    return jsonResponse({ message: error instanceof Error ? error.message : "Invalid plan." }, { status: 400 });
  }

  if (!plan.id) {
    return jsonResponse({ message: "PayPal plan is not configured." }, { status: 500 });
  }

  const user = await getCurrentUser(request);
  if (!user) {
    return jsonResponse({ message: "Please sign in before starting checkout." }, { status: 401 });
  }

  try {
    const token = await getPaypalAccessToken(env);
    const customIdParts = [
      user.id ? `uid:${user.id}` : "",
      user.email ? `email:${user.email}` : "",
      `plan:${plan.name}`
    ].filter(Boolean);

    const paypalResponse = await fetch(`${paypalApiBase(env)}/v1/billing/subscriptions`, {
      body: JSON.stringify({
        application_context: {
          brand_name: "VideoToSRT",
          cancel_url: `${SITE_URL}/pricing?checkout=cancelled&plan=${encodeURIComponent(plan.name)}`,
          locale: "en-US",
          return_url: `${SITE_URL}/pricing?checkout=success&plan=${encodeURIComponent(plan.name)}`,
          shipping_preference: "NO_SHIPPING",
          user_action: "SUBSCRIBE_NOW"
        },
        custom_id: customIdParts.join("|").slice(0, 127),
        plan_id: plan.id,
        subscriber: {
          email_address: user.email,
          name: {
            given_name: userLabel(user).slice(0, 140)
          }
        }
      }),
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "return=representation"
      },
      method: "POST"
    });

    const data = await paypalResponse.json() as PaypalSubscriptionResponse & { message?: string; name?: string };
    if (!paypalResponse.ok) {
      return jsonResponse(
        { message: data.message ?? data.name ?? "Could not create PayPal subscription." },
        { status: paypalResponse.status }
      );
    }

    const approveUrl = data.links?.find((link) => link.rel === "approve")?.href;
    if (!approveUrl) {
      return jsonResponse({ message: "PayPal did not return an approval URL." }, { status: 502 });
    }

    return jsonResponse({
      id: data.id,
      provider: "paypal",
      sessionUrl: approveUrl,
      url: approveUrl
    });
  } catch (error) {
    return jsonResponse(
      { message: error instanceof Error ? error.message : "Could not start PayPal checkout." },
      { status: 500 }
    );
  }
}

async function verifyPaypalWebhook(request: Request, env: Env, webhookEvent: unknown) {
  if (!env.PAYPAL_WEBHOOK_ID) {
    throw new Error("PayPal webhook ID is not configured.");
  }

  const token = await getPaypalAccessToken(env);
  const response = await fetch(`${paypalApiBase(env)}/v1/notifications/verify-webhook-signature`, {
    body: JSON.stringify({
      auth_algo: request.headers.get("paypal-auth-algo"),
      cert_url: request.headers.get("paypal-cert-url"),
      transmission_id: request.headers.get("paypal-transmission-id"),
      transmission_sig: request.headers.get("paypal-transmission-sig"),
      transmission_time: request.headers.get("paypal-transmission-time"),
      webhook_event: webhookEvent,
      webhook_id: env.PAYPAL_WEBHOOK_ID
    }),
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  const data = await response.json() as { verification_status?: string };
  return response.ok && data.verification_status === "SUCCESS";
}

async function handlePaypalWebhook(request: Request, env: Env) {
  if (request.method.toUpperCase() !== "POST") {
    return jsonResponse({ message: "Method not allowed." }, { status: 405 });
  }

  const rawBody = await request.text();
  let event: unknown;

  try {
    event = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ message: "Invalid webhook payload." }, { status: 400 });
  }

  let verified = false;
  try {
    verified = await verifyPaypalWebhook(request, env, event);
  } catch (error) {
    return jsonResponse(
      { message: error instanceof Error ? error.message : "Could not verify PayPal webhook." },
      { status: 500 }
    );
  }

  if (!verified) {
    return jsonResponse({ message: "Invalid PayPal webhook signature." }, { status: 401 });
  }

  if (env.PAYPAL_WEBHOOK_FORWARD_URL) {
    const forwardHeaders = new Headers(request.headers);
    forwardHeaders.set("content-type", "application/json");

    const forwardResponse = await fetch(env.PAYPAL_WEBHOOK_FORWARD_URL, {
      body: rawBody,
      headers: forwardHeaders,
      method: "POST"
    });

    if (!forwardResponse.ok) {
      return jsonResponse({ message: "Webhook verified but downstream processing failed." }, { status: 502 });
    }
  }

  return jsonResponse({ ok: true, provider: "paypal" });
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

    if (url.pathname === "/api/checkout") {
      return createPaypalCheckout(request, env);
    }

    if (url.pathname === "/api/paypal/webhook") {
      return handlePaypalWebhook(request, env);
    }

    if (
      url.pathname === "/api/admin/users" ||
      url.pathname === "/api/auth/email/send-code" ||
      url.pathname === "/api/auth/email/verify" ||
      url.pathname === "/api/auth/logout" ||
      url.pathname === "/api/auth/me" ||
      url.pathname === "/api/auth/oauth/bridge" ||
      url.pathname === "/api/auth/session/complete" ||
      url.pathname === "/api/checkout/paypal" ||
      url.pathname === "/api/checkout/paypal/credits" ||
      url.pathname === "/api/checkout/paypal/credits/capture" ||
      url.pathname === "/api/checkout/paypal/sync" ||
      url.pathname === "/api/webhooks/paypal"
    ) {
      return openNextWorker.fetch(request, env, ctx);
    }

    if (url.pathname.startsWith(`${API_PROXY_PREFIX}/`)) {
      return proxyApi(request);
    }

    return openNextWorker.fetch(request, env, ctx);
  }
};
