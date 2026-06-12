import {
  createPaypalSubscription,
  getCurrentUser,
  getEnv,
  jsonResponse,
  readJson,
  type PaypalBillingCycle,
  type PaypalPlanTier
} from "@/lib/paypal";

type CheckoutPayload = {
  billing?: PaypalBillingCycle;
  plan?: PaypalPlanTier;
};

function isBillingCycle(value: unknown): value is PaypalBillingCycle {
  return value === "monthly" || value === "yearly";
}

function isPlanTier(value: unknown): value is PaypalPlanTier {
  return value === "pro" || value === "studio";
}

export async function POST(request: Request) {
  const payload = await readJson<CheckoutPayload>(request);

  if (!isPlanTier(payload?.plan)) {
    return jsonResponse({ message: "Invalid plan. Use pro or studio." }, { status: 400 });
  }

  const billing = payload?.billing ?? "monthly";
  if (!isBillingCycle(billing)) {
    return jsonResponse({ message: "Invalid billing. Use monthly or yearly." }, { status: 400 });
  }

  const user = await getCurrentUser(request);
  if (!user) {
    return jsonResponse({ message: "Please sign in before starting checkout." }, { status: 401 });
  }

  try {
    const env = await getEnv();
    const subscription = await createPaypalSubscription({
      billing,
      env,
      request,
      tier: payload.plan,
      user
    });

    return jsonResponse({
      approvalUrl: subscription.approvalUrl,
      id: subscription.id,
      provider: subscription.provider,
      url: subscription.approvalUrl
    });
  } catch (error) {
    return jsonResponse(
      { message: error instanceof Error ? error.message : "Could not start PayPal checkout." },
      { status: 500 }
    );
  }
}
