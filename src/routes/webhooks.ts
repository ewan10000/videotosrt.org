import { Hono } from "hono";
import { addCredits } from "../lib/credits";
import { nowIso } from "../lib/env";
import { fail, ok } from "../lib/response";
import type { HonoAppEnv } from "../types";

type CreemCheckoutSession = {
  id: string;
  request_id?: string | null;
  metadata?: {
    user_id?: string;
    plan?: string;
    minutes?: string | number;
  } | null;
};

type CreemEvent = {
  id: string;
  type: string;
  metadata?: CreemCheckoutSession["metadata"];
  data: {
    object: unknown;
  };
};

const PLAN_MINUTES: Record<string, number> = {
  pro: 120,
  business: 600,
};

const encoder = new TextEncoder();

function hex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmacSha256Hex(secret: string, value: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  return hex(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

function parseCreemSignatures(signatureHeader: string) {
  if (!signatureHeader.includes("=")) return [signatureHeader];

  const signatures: string[] = [];
  for (const part of signatureHeader.split(",")) {
    const [key, value] = part.split("=", 2);
    if (value && (key === "v1" || key === "signature")) signatures.push(value);
  }
  return signatures;
}

async function verifyCreemSignature(rawBody: string, signatureHeader: string | null, secret: string) {
  if (!signatureHeader) return false;

  const signatures = parseCreemSignatures(signatureHeader);
  if (signatures.length === 0) return false;

  const expected = await hmacSha256Hex(secret, rawBody);
  return signatures.some((signature) => timingSafeEqual(signature, expected));
}

async function shouldProcessCreemEvent(env: HonoAppEnv["Bindings"], event: CreemEvent) {
  try {
    const existing = await env.DB.prepare("SELECT processed_at FROM creem_events WHERE id = ?")
      .bind(event.id)
      .first<{ processed_at: string | null }>();

    if (existing?.processed_at) return false;

    const now = nowIso();
    await env.DB.prepare(
      `INSERT OR IGNORE INTO creem_events (id, type, processed_at, created_at)
       VALUES (?, ?, NULL, ?)`,
    )
      .bind(event.id, event.type, now)
      .run();
  } catch {
    return true;
  }

  return true;
}

async function markCreemEventProcessed(env: HonoAppEnv["Bindings"], eventId: string) {
  try {
    await env.DB.prepare("UPDATE creem_events SET processed_at = ? WHERE id = ?").bind(nowIso(), eventId).run();
  } catch {
    return;
  }
}

async function handleCheckoutCompleted(env: HonoAppEnv["Bindings"], session: CreemCheckoutSession, event: CreemEvent) {
  const metadata = session.metadata ?? event.metadata ?? null;
  const userId = metadata?.user_id || session.request_id;
  const plan = metadata?.plan;
  const metadataMinutes = Number(metadata?.minutes);
  const minutes = Number.isFinite(metadataMinutes) && metadataMinutes > 0 ? metadataMinutes : plan ? PLAN_MINUTES[plan] : 0;

  if (!userId || !minutes) {
    throw new Error("Creem checkout session is missing user or plan metadata");
  }

  await addCredits(env, userId, minutes, `Creem checkout ${session.id}`);
}

export const webhookRoutes = new Hono<HonoAppEnv>();

webhookRoutes.post("/webhook", async (c) => {
  const rawBody = await c.req.text();
  const verified = await verifyCreemSignature(rawBody, c.req.header("creem-signature") ?? null, c.env.CREEM_WEBHOOK_SECRET);
  if (!verified) return fail(c, 400, "INVALID_SIGNATURE", "Invalid Creem webhook signature");

  let event: CreemEvent;
  try {
    event = JSON.parse(rawBody) as CreemEvent;
  } catch {
    return fail(c, 400, "INVALID_PAYLOAD", "Invalid Creem webhook payload");
  }

  const shouldProcess = await shouldProcessCreemEvent(c.env, event);
  if (!shouldProcess) return ok(c, { received: true, duplicate: true });

  if (event.type === "checkout.completed") {
    await handleCheckoutCompleted(c.env, event.data.object as CreemCheckoutSession, event);
  }

  await markCreemEventProcessed(c.env, event.id);
  return ok(c, { received: true });
});
