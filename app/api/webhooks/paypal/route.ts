import {
  getEnv,
  jsonResponse,
  updateUserPlanFromPaypalEvent,
  verifyPaypalWebhook
} from "@/lib/paypal";

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

const handledEvents = new Set([
  "BILLING.SUBSCRIPTION.ACTIVATED",
  "BILLING.SUBSCRIPTION.CANCELLED"
]);

export async function POST(request: Request) {
  const rawBody = await request.text();
  let event: PaypalWebhookEvent;

  try {
    event = JSON.parse(rawBody) as PaypalWebhookEvent;
  } catch {
    return jsonResponse({ message: "Invalid webhook payload." }, { status: 400 });
  }

  try {
    const env = await getEnv();
    const verified = await verifyPaypalWebhook({ env, event, request });

    if (!verified) {
      return jsonResponse({ message: "Invalid PayPal webhook signature." }, { status: 401 });
    }

    if (!event.event_type || !handledEvents.has(event.event_type)) {
      return jsonResponse({ ok: true, ignored: event.event_type ?? "unknown" });
    }

    const result = await updateUserPlanFromPaypalEvent({
      env,
      event,
      rawBody,
      request
    });

    return jsonResponse({
      ok: true,
      event: event.event_type,
      plan: result.plan,
      update: result.method
    });
  } catch (error) {
    return jsonResponse(
      { message: error instanceof Error ? error.message : "Could not process PayPal webhook." },
      { status: 500 }
    );
  }
}
