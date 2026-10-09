import type { Bindings } from '../types';

export async function hasStripeSchema(env: Bindings) {
  return Boolean(await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='stripe_accounts'").first());
}

// Read provider ownership again rather than trusting a user snapshot from request start.
export async function effectivePlan(env: Bindings, userId: string, fallback: unknown) {
  if (!await hasStripeSchema(env)) return fallback;
  const account = await env.DB.prepare(`SELECT u.plan, s.status, s.paid_through FROM stripe_accounts s JOIN users u ON u.id=s.user_id WHERE s.user_id=? AND s.subscription_id IS NOT NULL`).bind(userId).first<{plan:string;status:string;paid_through:number}>();
  if (!account) return fallback;
  return account.status === 'active' && account.paid_through > Math.floor(Date.now()/1000) ? account.plan : 'free';
}
