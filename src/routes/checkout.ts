import { Hono } from "hono";
import { appOrigin } from "../lib/env";
import { fail, ok } from "../lib/response";
import { requireUser } from "../lib/session";
import type { HonoAppEnv } from "../types";

type Plan = "pro" | "business";

const PLANS: Record<Plan, { productId: string; minutes: number }> = {
  pro: { productId: "pro_01JS8ZQ3Z3Z3Z3Z3Z3Z3Z3Z3Z", minutes: 120 },
  business: { productId: "business_01JS8ZQ3Z3Z3Z3Z3Z3Z3Z3Z3Z", minutes: 600 },
};

async function createCreemCheckoutSession(
  env: HonoAppEnv["Bindings"],
  input: {
    userId: string;
    email: string;
    plan: Plan;
    successUrl: string;
    cancelUrl: string;
  },
) {
  const plan = PLANS[input.plan];

  const response = await fetch("https://api.creem.io/v1/checkouts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.CREEM_API_KEY,
    },
    body: JSON.stringify({
      product_id: plan.productId,
      request_id: input.userId,
      success_url: input.successUrl,
      customer: {
        email: input.email,
      },
      metadata: {
        user_id: input.userId,
        plan: input.plan,
        minutes: plan.minutes,
      },
    }),
  });

  const data = await response.json<{ id?: string; checkout_url?: string; error?: { message?: string } }>();
  if (!response.ok || !data.id || !data.checkout_url) {
    throw new Error(data.error?.message || "Creem checkout creation failed");
  }

  return { id: data.id, url: data.checkout_url };
}

export const checkoutRoutes = new Hono<HonoAppEnv>();

checkoutRoutes.post("/checkout", async (c) => {
  const user = requireUser(c);
  if (!user) return fail(c, 401, "UNAUTHORIZED", "Authentication required");
  if (c.env.PAYMENT_PROVIDER && c.env.PAYMENT_PROVIDER !== "creem") {
    return fail(c, 400, "PAYMENT_PROVIDER_UNAVAILABLE", "Creem payments are not enabled");
  }

  const body: { plan?: string; success_url?: string; cancel_url?: string } = await c.req.json().catch(() => ({}));
  const plan = body.plan as Plan | undefined;
  if (!plan || !(plan in PLANS)) {
    return fail(c, 400, "INVALID_PLAN", "plan must be pro or business");
  }

  const origin = appOrigin(c.env);
  const successUrl = body.success_url || `${origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = body.cancel_url || `${origin}/billing/cancel`;

  try {
    const session = await createCreemCheckoutSession(c.env, {
      userId: user.id,
      email: user.email,
      plan,
      successUrl,
      cancelUrl,
    });

    return ok(c, {
      provider: "creem",
      session_id: session.id,
      checkout_url: session.url,
      plan,
      minutes: PLANS[plan].minutes,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create checkout session";
    return fail(c, 502, "CHECKOUT_FAILED", message);
  }
});
