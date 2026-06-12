import {
  capturePaypalCreditsOrder,
  getCurrentUser,
  getEnv,
  jsonResponse,
  readJson
} from "@/lib/paypal";

type CapturePayload = {
  orderId?: string;
};

export async function POST(request: Request) {
  const payload = await readJson<CapturePayload>(request);
  const orderId = payload?.orderId?.trim();

  if (!orderId) {
    return jsonResponse({ message: "PayPal order ID is required." }, { status: 400 });
  }

  const user = await getCurrentUser(request);
  if (!user) {
    return jsonResponse({ message: "Please sign in before syncing credits." }, { status: 401 });
  }

  try {
    const env = await getEnv();
    const result = await capturePaypalCreditsOrder({ env, orderId, user });

    return jsonResponse({
      ok: true,
      applied: result.applied,
      credits: result.credits,
      hours: result.hours,
      status: result.status,
      update: result.method,
      user: result.membership
        ? { ...user, extra_credit_hours: result.membership.extra_credit_hours, plan: result.membership.plan }
        : null
    });
  } catch (error) {
    return jsonResponse(
      { message: error instanceof Error ? error.message : "Could not capture PayPal credits order." },
      { status: 500 }
    );
  }
}
