import {
  createPaypalCreditsOrder,
  getCurrentUser,
  getEnv,
  jsonResponse,
  readJson,
  type PaypalCreditPackage
} from "@/lib/paypal";

type CreditsPayload = {
  credits?: PaypalCreditPackage;
};

function isCreditPackage(value: unknown): value is PaypalCreditPackage {
  return value === "2h" || value === "5h" || value === "20h";
}

export async function POST(request: Request) {
  const payload = await readJson<CreditsPayload>(request);

  if (!isCreditPackage(payload?.credits)) {
    return jsonResponse({ message: "Invalid credits package. Use 2h, 5h, or 20h." }, { status: 400 });
  }

  const user = await getCurrentUser(request);
  if (!user) {
    return jsonResponse({ message: "Please sign in before buying extra hours." }, { status: 401 });
  }

  try {
    const env = await getEnv();
    const order = await createPaypalCreditsOrder({
      creditPackage: payload.credits,
      env,
      user
    });

    return jsonResponse({
      approvalUrl: order.approvalUrl,
      hours: order.hours,
      id: order.id,
      provider: order.provider,
      url: order.approvalUrl
    });
  } catch (error) {
    return jsonResponse(
      { message: error instanceof Error ? error.message : "Could not start PayPal credits checkout." },
      { status: 500 }
    );
  }
}
