import { getCloudflareContext } from "@opennextjs/cloudflare";
import { readLocalAuthUser } from "@/lib/local-auth";

export type PaypalBillingCycle = "monthly" | "yearly";
export type PaypalPlanTier = "pro" | "studio";
export type UserPlan = "free" | "pro" | "studio";
export type PaypalCreditPackage = "2h" | "5h" | "20h";

type CloudflareEnvWithPaypal = CloudflareEnv & {
  DB?: D1DatabaseLike;
  PAYPAL_CLIENT_ID?: string;
  PAYPAL_CLIENT_SECRET?: string;
  PAYPAL_ENVIRONMENT?: "sandbox" | "live";
  PAYPAL_MONTHLY_PLAN_ID?: string;
  PAYPAL_YEARLY_PLAN_ID?: string;
  PAYPAL_PRO_MONTHLY_PLAN_ID?: string;
  PAYPAL_PRO_YEARLY_PLAN_ID?: string;
  PAYPAL_STUDIO_MONTHLY_PLAN_ID?: string;
  PAYPAL_STUDIO_YEARLY_PLAN_ID?: string;
  PAYPAL_WEBHOOK_ID?: string;
  PAYPAL_WEBHOOK_FORWARD_URL?: string;
};

type D1DatabaseLike = {
  prepare(query: string): {
    bind(...values: unknown[]): {
      run(): Promise<unknown>;
    };
  };
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

type PaypalSubscription = {
  custom_id?: string;
  id?: string;
  links?: Array<{
    href?: string;
    rel?: string;
  }>;
  status?: string;
  subscriber?: {
    email_address?: string;
  };
};

type PaypalOrder = {
  id?: string;
  links?: Array<{
    href?: string;
    rel?: string;
  }>;
  message?: string;
  name?: string;
  status?: string;
};

type PaypalWebhookEvent = {
  event_type?: string;
  resource?: {
    custom_id?: string;
    id?: string;
    subscriber?: {
      email_address?: string;
    };
  };
};

const SITE_URL = "https://videotosrt.org";
const UPSTREAM_API_BASE = "https://api.videotosrt.org/api";

export async function getEnv() {
  const context = await getCloudflareContext({ async: true });
  return context.env as CloudflareEnvWithPaypal;
}

export function paypalApiBase(env: CloudflareEnvWithPaypal) {
  return env.PAYPAL_ENVIRONMENT === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

export function jsonResponse(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");

  return new Response(JSON.stringify(body), {
    ...init,
    headers
  });
}

export async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return await request.json() as T;
  } catch {
    return null;
  }
}

function filterProxyRequestHeaders(headers: Headers) {
  const nextHeaders = new Headers(headers);

  nextHeaders.delete("host");
  nextHeaders.delete("origin");
  nextHeaders.delete("referer");
  nextHeaders.delete("content-length");

  return nextHeaders;
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

export async function getCurrentUser(request: Request) {
  const localUser = readLocalAuthUser(request);
  if (localUser) {
    return localUser;
  }

  const response = await fetch(`${UPSTREAM_API_BASE}/auth/me`, {
    headers: filterProxyRequestHeaders(request.headers),
    method: "GET"
  });

  if (!response.ok) {
    return null;
  }

  return normalizeUser(await response.json() as ApiUserResponse);
}

export async function getPaypalAccessToken(env: CloudflareEnvWithPaypal) {
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

export function getPaypalPlan(env: CloudflareEnvWithPaypal, tier: PaypalPlanTier, billing: PaypalBillingCycle) {
  if (tier === "pro" && billing === "monthly") {
    return {
      billing,
      name: "pro monthly" as const,
      planId: env.PAYPAL_MONTHLY_PLAN_ID ?? env.PAYPAL_PRO_MONTHLY_PLAN_ID,
      tier,
      userPlan: "pro" as const
    };
  }

  if (tier === "pro" && billing === "yearly") {
    return {
      billing,
      name: "pro yearly" as const,
      planId: env.PAYPAL_PRO_YEARLY_PLAN_ID ?? env.PAYPAL_YEARLY_PLAN_ID,
      tier,
      userPlan: "pro" as const
    };
  }

  if (tier === "studio" && billing === "monthly") {
    return {
      billing,
      name: "studio monthly" as const,
      planId: env.PAYPAL_STUDIO_MONTHLY_PLAN_ID,
      tier,
      userPlan: "studio" as const
    };
  }

  return {
    billing,
    name: "studio yearly" as const,
    planId: env.PAYPAL_STUDIO_YEARLY_PLAN_ID,
    tier,
    userPlan: "studio" as const
  };
}

export function getPaypalCreditPackage(creditPackage: PaypalCreditPackage) {
  if (creditPackage === "2h") {
    return { amount: "5.00", hours: 2, label: "2 hours" };
  }

  if (creditPackage === "5h") {
    return { amount: "12.00", hours: 5, label: "5 hours" };
  }

  return { amount: "39.00", hours: 20, label: "20 hours" };
}

export function encodeCustomId(input: { email?: string; plan: UserPlan; userId?: string }) {
  return [
    input.userId ? `uid:${input.userId}` : "",
    input.email ? `email:${input.email}` : "",
    `plan:${input.plan}`
  ].filter(Boolean).join("|").slice(0, 127);
}

export function parseCustomId(customId?: string) {
  const parsed: { credits?: PaypalCreditPackage; email?: string; plan?: UserPlan; userId?: string } = {};

  for (const part of customId?.split("|") ?? []) {
    const [key, ...valueParts] = part.split(":");
    const value = valueParts.join(":");

    if (key === "uid" && value) {
      parsed.userId = value;
    }

    if (key === "email" && value) {
      parsed.email = value;
    }

    if (key === "plan" && (value === "pro" || value === "studio" || value === "free")) {
      parsed.plan = value;
    }

    if (key === "credits" && (value === "2h" || value === "5h" || value === "20h")) {
      parsed.credits = value;
    }
  }

  return parsed;
}

export async function createPaypalSubscription(input: {
  billing: PaypalBillingCycle;
  env: CloudflareEnvWithPaypal;
  request: Request;
  tier: PaypalPlanTier;
  user: ApiUser;
}) {
  const paypalPlan = getPaypalPlan(input.env, input.tier, input.billing);
  if (!paypalPlan.planId) {
    throw new Error(`PayPal ${paypalPlan.name} plan is not configured.`);
  }

  const token = await getPaypalAccessToken(input.env);
  const response = await fetch(`${paypalApiBase(input.env)}/v1/billing/subscriptions`, {
    body: JSON.stringify({
      application_context: {
        brand_name: "videotosrt",
        cancel_url: `${SITE_URL}/pricing?checkout=cancelled&plan=${encodeURIComponent(paypalPlan.tier)}&billing=${encodeURIComponent(paypalPlan.billing)}`,
        locale: "en-US",
        return_url: `${SITE_URL}/pricing?checkout=success&plan=${encodeURIComponent(paypalPlan.tier)}&billing=${encodeURIComponent(paypalPlan.billing)}`,
        shipping_preference: "NO_SHIPPING",
        user_action: "SUBSCRIBE_NOW"
      },
      custom_id: encodeCustomId({
        email: input.user.email,
        plan: paypalPlan.userPlan,
        userId: input.user.id
      }),
      plan_id: paypalPlan.planId,
      subscriber: {
        email_address: input.user.email,
        name: {
          given_name: userLabel(input.user).slice(0, 140)
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

  const data = await response.json() as PaypalSubscription & { message?: string; name?: string };

  if (!response.ok) {
    throw new Error(data.message ?? data.name ?? "Could not create PayPal subscription.");
  }

  const approvalUrl = data.links?.find((link) => link.rel === "approve")?.href;
  if (!approvalUrl) {
    throw new Error("PayPal did not return an approval URL.");
  }

  return {
    approvalUrl,
    id: data.id,
    provider: "paypal"
  };
}

export async function getPaypalSubscription(input: {
  env: CloudflareEnvWithPaypal;
  subscriptionId: string;
}) {
  const token = await getPaypalAccessToken(input.env);
  const response = await fetch(`${paypalApiBase(input.env)}/v1/billing/subscriptions/${encodeURIComponent(input.subscriptionId)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    method: "GET"
  });

  const data = await response.json() as PaypalSubscription & { message?: string; name?: string };
  if (!response.ok) {
    throw new Error(data.message ?? data.name ?? "Could not read PayPal subscription.");
  }

  return data;
}

export async function syncUserPlanFromPaypalSubscription(input: {
  env: CloudflareEnvWithPaypal;
  fallbackBilling?: PaypalBillingCycle;
  fallbackTier?: PaypalPlanTier;
  subscription: PaypalSubscription;
  user: ApiUser;
}) {
  if (input.subscription.status !== "ACTIVE") {
    throw new Error(`PayPal subscription is ${input.subscription.status ?? "not active"}.`);
  }

  const parsed = parseCustomId(input.subscription.custom_id);
  const paypalEmail = parsed.email ?? input.subscription.subscriber?.email_address;
  if (paypalEmail && input.user.email && paypalEmail.toLowerCase() !== input.user.email.toLowerCase()) {
    throw new Error("This PayPal subscription belongs to another account.");
  }

  const nextPlan = parsed.plan ?? input.fallbackTier ?? "pro";
  if (input.env.DB && (input.user.id || input.user.email)) {
    if (input.user.id) {
      await input.env.DB
        .prepare("UPDATE users SET plan = ? WHERE id = ?")
        .bind(nextPlan, input.user.id)
        .run();
      return { method: "d1", plan: nextPlan };
    }

    await input.env.DB
      .prepare("UPDATE users SET plan = ? WHERE email = ?")
      .bind(nextPlan, input.user.email)
      .run();
    return { method: "d1", plan: nextPlan };
  }

  return { method: "client-sync" as const, plan: nextPlan };
}

export async function createPaypalCreditsOrder(input: {
  creditPackage: PaypalCreditPackage;
  env: CloudflareEnvWithPaypal;
  user: ApiUser;
}) {
  const packageDetails = getPaypalCreditPackage(input.creditPackage);
  const token = await getPaypalAccessToken(input.env);
  const response = await fetch(`${paypalApiBase(input.env)}/v2/checkout/orders`, {
    body: JSON.stringify({
      application_context: {
        brand_name: "videotosrt",
        cancel_url: `${SITE_URL}/pricing?checkout=credits-cancelled&credits=${encodeURIComponent(input.creditPackage)}`,
        return_url: `${SITE_URL}/pricing?checkout=credits-success&credits=${encodeURIComponent(input.creditPackage)}`,
        shipping_preference: "NO_SHIPPING",
        user_action: "PAY_NOW"
      },
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "USD",
            value: packageDetails.amount
          },
          custom_id: [
            input.user.id ? `uid:${input.user.id}` : "",
            input.user.email ? `email:${input.user.email}` : "",
            `credits:${input.creditPackage}`
          ].filter(Boolean).join("|").slice(0, 127),
          description: `VideoToSRT pay-as-you-go ${packageDetails.label}`,
          reference_id: input.creditPackage
        }
      ]
    }),
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    },
    method: "POST"
  });

  const data = await response.json() as PaypalOrder;
  if (!response.ok) {
    throw new Error(data.message ?? data.name ?? "Could not create PayPal order.");
  }

  const approvalUrl = data.links?.find((link) => link.rel === "approve")?.href;
  if (!approvalUrl || !data.id) {
    throw new Error("PayPal did not return an approval URL.");
  }

  return {
    approvalUrl,
    hours: packageDetails.hours,
    id: data.id,
    provider: "paypal"
  };
}

export async function capturePaypalCreditsOrder(input: {
  env: CloudflareEnvWithPaypal;
  orderId: string;
  user: ApiUser;
}) {
  const token = await getPaypalAccessToken(input.env);
  const response = await fetch(`${paypalApiBase(input.env)}/v2/checkout/orders/${encodeURIComponent(input.orderId)}/capture`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  const data = await response.json() as PaypalOrder & {
    purchase_units?: Array<{
      custom_id?: string;
      payments?: {
        captures?: Array<{
          custom_id?: string;
          status?: string;
        }>;
      };
      reference_id?: string;
    }>;
  };

  if (!response.ok && data.name !== "UNPROCESSABLE_ENTITY") {
    throw new Error(data.message ?? data.name ?? "Could not capture PayPal order.");
  }

  const purchaseUnit = data.purchase_units?.[0];
  const capture = purchaseUnit?.payments?.captures?.[0];
  const parsed = parseCustomId(capture?.custom_id ?? purchaseUnit?.custom_id);
  const creditPackage = parsed.credits ?? (purchaseUnit?.reference_id as PaypalCreditPackage | undefined);
  if (creditPackage !== "2h" && creditPackage !== "5h" && creditPackage !== "20h") {
    throw new Error("PayPal order package is not recognized.");
  }

  const paypalEmail = parsed.email;
  if (paypalEmail && input.user.email && paypalEmail.toLowerCase() !== input.user.email.toLowerCase()) {
    throw new Error("This PayPal order belongs to another account.");
  }

  const packageDetails = getPaypalCreditPackage(creditPackage);
  return {
    credits: creditPackage,
    hours: packageDetails.hours,
    method: input.env.DB ? "d1-pending-schema" : "client-sync",
    status: capture?.status ?? data.status ?? "captured"
  };
}

export async function verifyPaypalWebhook(input: {
  env: CloudflareEnvWithPaypal;
  event: unknown;
  request: Request;
}) {
  if (!input.env.PAYPAL_WEBHOOK_ID) {
    throw new Error("PayPal webhook ID is not configured.");
  }

  const token = await getPaypalAccessToken(input.env);
  const response = await fetch(`${paypalApiBase(input.env)}/v1/notifications/verify-webhook-signature`, {
    body: JSON.stringify({
      auth_algo: input.request.headers.get("paypal-auth-algo"),
      cert_url: input.request.headers.get("paypal-cert-url"),
      transmission_id: input.request.headers.get("paypal-transmission-id"),
      transmission_sig: input.request.headers.get("paypal-transmission-sig"),
      transmission_time: input.request.headers.get("paypal-transmission-time"),
      webhook_event: input.event,
      webhook_id: input.env.PAYPAL_WEBHOOK_ID
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

async function forwardWebhook(env: CloudflareEnvWithPaypal, rawBody: string, request: Request) {
  if (!env.PAYPAL_WEBHOOK_FORWARD_URL) {
    return;
  }

  const headers = new Headers(request.headers);
  headers.set("content-type", "application/json");

  const response = await fetch(env.PAYPAL_WEBHOOK_FORWARD_URL, {
    body: rawBody,
    headers,
    method: "POST"
  });

  if (!response.ok) {
    throw new Error("Webhook verified but downstream processing failed.");
  }
}

export async function updateUserPlanFromPaypalEvent(input: {
  env: CloudflareEnvWithPaypal;
  event: PaypalWebhookEvent;
  rawBody: string;
  request: Request;
}) {
  const resource = input.event.resource;
  const parsed = parseCustomId(resource?.custom_id);
  const email = parsed.email ?? resource?.subscriber?.email_address;
  const nextPlan: UserPlan =
    input.event.event_type === "BILLING.SUBSCRIPTION.CANCELLED"
      ? "free"
      : parsed.plan ?? "pro";

  if (input.env.DB && (parsed.userId || email)) {
    if (parsed.userId) {
      await input.env.DB
        .prepare("UPDATE users SET plan = ? WHERE id = ?")
        .bind(nextPlan, parsed.userId)
        .run();
      return { method: "d1", plan: nextPlan };
    }

    await input.env.DB
      .prepare("UPDATE users SET plan = ? WHERE email = ?")
      .bind(nextPlan, email)
      .run();
    return { method: "d1", plan: nextPlan };
  }

  await forwardWebhook(input.env, input.rawBody, input.request);
  return { method: input.env.PAYPAL_WEBHOOK_FORWARD_URL ? "forwarded" : "noop", plan: nextPlan };
}
