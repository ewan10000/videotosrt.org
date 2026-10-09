import { forwardWebhook, getEnv, jsonResponse, verifyPaypalWebhook } from '@/lib/paypal';

// Historic URL verified and forwarded events; preserve that contract for legacy users.
export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    let event: unknown;
    try { event = JSON.parse(rawBody); } catch {
      return jsonResponse({ message: "Invalid webhook payload." }, { status: 400 });
    }
    const env = await getEnv();
    const legacyEnv = { ...env, PAYPAL_ENVIRONMENT: env.PAYPAL_ENVIRONMENT ?? "live" };
    if (!await verifyPaypalWebhook({ env: legacyEnv, event, request })) {
      return jsonResponse({ message: "Invalid PayPal webhook signature." }, { status: 401 });
    }
    await forwardWebhook(env, rawBody, request);
    return jsonResponse({ ok: true, provider: "paypal" });
  } catch {
    return jsonResponse({ message: "Legacy webhook processing is unavailable." }, { status: 503 });
  }
}
