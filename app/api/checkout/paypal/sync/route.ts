import {
  getCurrentUser,
  getEnv,
  getPaypalSubscription,
  jsonResponse,
  readJson,
  syncUserPlanFromPaypalSubscription,
  type PaypalBillingCycle,
  type PaypalPlanTier
} from "@/lib/paypal";

type SyncPayload = {
  billing?: PaypalBillingCycle;
  plan?: PaypalPlanTier;
  subscriptionId?: string;
};

function isBillingCycle(value: unknown): value is PaypalBillingCycle {
  return value === "monthly" || value === "yearly";
}

function isPlanTier(value: unknown): value is PaypalPlanTier {
  return value === "pro" || value === "studio";
}

export async function POST(request: Request) {
  const payload = await readJson<SyncPayload>(request);
  const subscriptionId = payload?.subscriptionId?.trim();

  if (!subscriptionId) {
    return jsonResponse({ message: "PayPal subscription ID is required." }, { status: 400 });
  }

  if (payload?.plan && !isPlanTier(payload.plan)) {
    return jsonResponse({ message: "Invalid plan. Use pro or studio." }, { status: 400 });
  }

  if (payload?.billing && !isBillingCycle(payload.billing)) {
    return jsonResponse({ message: "Invalid billing. Use monthly or yearly." }, { status: 400 });
  }

  const user = await getCurrentUser(request);
  if (!user) {
    return jsonResponse({ message: "Please sign in before syncing checkout." }, { status: 401 });
  }

  try {
    const env = await getEnv();
    const subscription = await getPaypalSubscription({ env, subscriptionId });
    const result = await syncUserPlanFromPaypalSubscription({
      env,
      fallbackBilling: payload?.billing,
      fallbackTier: payload?.plan,
      subscription,
      user
    });

    return jsonResponse({
      ok: true,
      plan: result.plan,
      subscriptionId: subscription.id ?? subscriptionId,
      update: result.method,
      user: {
        ...user,
        plan: result.plan,
        subscription_status: subscription.status
      }
    });
  } catch (error) {
    return jsonResponse(
      { message: error instanceof Error ? error.message : "Could not sync PayPal subscription." },
      { status: 500 }
    );
  }
}
