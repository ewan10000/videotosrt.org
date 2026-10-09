// Web APIs only: compatible with Cloudflare Workers and node test runner.
type Statement = {
    bind(...values: unknown[]): Statement;
    first<T>(): Promise<T | null>;
    all<T>(): Promise<{
        results: T[];
    }>;
    run(): Promise<unknown>;
};
export type BillingDB = {
    prepare(sql: string): Statement;
    batch(statements: Statement[]): Promise<unknown[]>;
};
export type StripeEnv = {
    DB?: BillingDB;
    STRIPE_SECRET_KEY?: string;
    STRIPE_WEBHOOK_SECRET?: string;
    STRIPE_BILLING_SHARED_DB?: string;
    STRIPE_PORTAL_CONFIGURATION_ID?: string;
    [key: string]: unknown;
};
export type BillingUser = {
    id: string;
    email: string;
    plan?: string;
};
type Selection = {
    price: string;
    mode: 'subscription' | 'payment';
    plan: 'pro' | 'studio' | 'free';
    minutes: number;
    amount: number;
    interval?: 'month' | 'year';
};
type StripeObject = {
    id: string;
    url?: string;
    mode?: string;
    status?: string;
    payment_status?: string;
    customer?: string;
    subscription?: string;
    metadata?: Record<string, string>;
    items?: {
        data: {
            price: {
                id: string;
            };
            current_period_end?: number;
        }[];
    };
    line_items?: {
        data: {
            price: {
                id: string;
            };
            quantity: number;
        }[];
    };
    active?: boolean;
    currency?: string;
    unit_amount?: number;
    type?: string;
    recurring?: {
        interval: string;
        interval_count: number;
    };
    livemode?: boolean;
    amount_total?: number;
    amount_subtotal?: number;
    currency_conversion?: {source_currency?: string; amount_subtotal?: number};
    latest_invoice?: {
        status?: string;
    };
    expires_at?: number;
    current_period_end?: number;
    payment_intent?: { status?: string; latest_charge?: { paid?: boolean; created?: number } };
};
export class BillingError extends Error {
    status: number;
    constructor(message: string, status = 503) { super(message); this.status = status; }
}
function billingOrigin(env: StripeEnv) {
    if (!env.STRIPE_SANDBOX_ORIGIN) return 'https://videotosrt.org';
    const url = new URL(String(env.STRIPE_SANDBOX_ORIGIN));
    if (!env.STRIPE_SECRET_KEY?.startsWith('sk_test_') || url.protocol !== 'https:' || !url.hostname.endsWith('.workers.dev') || url.origin !== env.STRIPE_SANDBOX_ORIGIN)
        throw new BillingError('Invalid sandbox billing origin.');
    return url.origin;
}
const catalog: Record<string, Omit<Selection, 'price'>> = {
    PRO_MONTHLY: { mode: 'subscription', plan: 'pro', minutes: 600, amount: 990, interval: 'month' },
    PRO_YEARLY: { mode: 'subscription', plan: 'pro', minutes: 600, amount: 9900, interval: 'year' },
    STUDIO_MONTHLY: { mode: 'subscription', plan: 'studio', minutes: 3000, amount: 2990, interval: 'month' },
    STUDIO_YEARLY: { mode: 'subscription', plan: 'studio', minutes: 3000, amount: 29900, interval: 'year' },
    CREDITS_2H: { mode: 'payment', plan: 'free', minutes: 120, amount: 500 },
    CREDITS_5H: { mode: 'payment', plan: 'free', minutes: 300, amount: 1200 },
    CREDITS_20H: { mode: 'payment', plan: 'free', minutes: 1200, amount: 3900 }
};
export function resolveSelection(env: StripeEnv, input: Record<string, unknown>): Selection {
    let key: string;
    if (['plan', 'billing', 'credits'].some(key => input[key] !== undefined && typeof input[key] !== 'string'))
        throw new BillingError('Invalid checkout selection.', 400);
    if (Object.keys(input).some(k => !['plan', 'billing', 'credits'].includes(k)))
        throw new BillingError('Invalid checkout selection.', 400);
    if (input.credits && !input.plan && !input.billing && ['2h', '5h', '20h'].includes(String(input.credits)))
        key = `CREDITS_${String(input.credits).toUpperCase()}`;
    else if (!input.credits && ['pro', 'studio'].includes(String(input.plan)) && ['monthly', 'yearly'].includes(String(input.billing ?? 'monthly')))
        key = `${String(input.plan).toUpperCase()}_${String(input.billing ?? 'monthly').toUpperCase()}`;
    else
        throw new BillingError('Invalid checkout selection.', 400);
    const price = env[`STRIPE_${key}_PRICE_ID`];
    if (typeof price === 'string' && Object.keys(catalog).some(other => other !== key && env[`STRIPE_${other}_PRICE_ID`] === price))
        throw new BillingError('Stripe prices must be configured distinctly. Please contact support.');
    if (typeof price !== 'string' || !/^price_[A-Za-z0-9]+$/.test(price))
        throw new BillingError('Stripe price is not configured. Please contact support.');
    return { ...catalog[key], price };
}
export async function authenticate(request: Request, fetcher: typeof fetch = fetch): Promise<BillingUser | null> {
    const headers = new Headers();
    const auth = request.headers.get('authorization');
    const cookie = request.headers.get('cookie')?.split(';').map(s => s.trim()).find(s => s.startsWith('vts_session='));
    if (auth) {
        if (!/^Bearer [^\s]+$/i.test(auth))
            return null;
        headers.set('authorization', auth);
    }
    else if (cookie)
        headers.set('cookie', cookie);
    else
        return null;
    const response = await fetcher('https://api.videotosrt.org/api/auth/me', { headers, redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(10000) });
    if (!response.ok)
        return null;
    const data = await response.json() as {
        user?: BillingUser;
        data?: {
            user?: BillingUser;
        };
    };
    const user = data.user ?? data.data?.user;
    return user?.id && user.email ? user : null;
}
async function stripe(env: StripeEnv, path: string, body?: URLSearchParams, key?: string): Promise<StripeObject> {
    if (!env.STRIPE_SECRET_KEY)
        throw new BillingError('Stripe billing is not configured. Please contact support.');
    const headers: Record<string, string> = { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, 'Stripe-Version': '2025-06-30.basil' };
    if (body)
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
    if (key)
        headers['Idempotency-Key'] = key;
    const response = await fetch(`https://api.stripe.com/v1/${path}`, { method: body ? 'POST' : 'GET', headers, body, redirect: 'manual', signal: AbortSignal.timeout(15000) });
    if (!response.ok) {
        if (env.STRIPE_SANDBOX_ORIGIN) {
            const details = await response.json().catch(() => null) as { error?: { code?: string; param?: string; type?: string } } | null;
            const safe = (value: unknown) => typeof value === 'string' && /^[a-zA-Z0-9_[\].-]{1,100}$/.test(value) ? value : 'unavailable';
            console.error('Sandbox Stripe request rejected', response.status, safe(details?.error?.type), safe(details?.error?.code), safe(details?.error?.param));
        }
        throw new BillingError('Stripe billing is temporarily unavailable. Please try again or contact support.', 502);
    }
    return await response.json() as StripeObject;
}
async function database(env: StripeEnv) {
    if (!env.DB || typeof env.DB.batch !== 'function' || env.STRIPE_BILLING_SHARED_DB !== 'true' || !env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET)
        throw new BillingError('Stripe billing and quota synchronization are not configured. Please contact support.');
    // Explicit migration is required; never create a second quota store or swallow schema errors.
    await env.DB.prepare('SELECT user_id, customer_id, subscription_id, status, event_created, mutation_token, paid_through FROM stripe_accounts LIMIT 1').first();
    await env.DB.prepare('SELECT user_id, month, minutes_used, minutes_limit FROM usage_records LIMIT 1').first();
    await env.DB.prepare('SELECT id, user_id, amount, type, description, created_at FROM credit_transactions LIMIT 1').first();
    await env.DB.prepare('SELECT id, user_id, price_id, mode, attempt FROM vts_stripe_checkouts LIMIT 1').first();
    await env.DB.prepare('SELECT user_id, attempt, expires_at FROM stripe_checkout_locks LIMIT 1').first();
    await env.DB.prepare('SELECT id, token, created FROM vts_stripe_events LIMIT 1').first();
    await env.DB.prepare('SELECT user_id, month, plan_minutes FROM stripe_quota_bases LIMIT 1').first();
    return env.DB;
}
export async function createCheckout(env: StripeEnv, user: BillingUser, input: Record<string, unknown>) {
    const origin = billingOrigin(env);
    const selection = resolveSelection(env, input), db = await database(env);
    if (selection.mode === 'subscription' && !env.STRIPE_PORTAL_CONFIGURATION_ID) throw new BillingError('Stripe billing management is not configured. Please contact support.');
    const stored = await db.prepare('SELECT id, plan FROM users WHERE id = ?').bind(user.id).first<{
        id: string;
        plan: string;
    }>();
    if (!stored)
        throw new BillingError('Your billing account could not be verified. Please contact support.', 409);
    const legacyPaid = await db.prepare("SELECT id FROM users WHERE email = ? AND id <> ? AND plan <> 'free' LIMIT 1").bind(user.email, user.id).first();
    const account = await db.prepare('SELECT * FROM stripe_accounts WHERE user_id = ?').bind(user.id).first<{
        customer_id: string;
        subscription_id: string | null;
        status: string;
    }>();
    if (selection.mode === 'subscription' && (legacyPaid || !['free', 'basic'].includes(stored.plan) || (account?.subscription_id && !['canceled', 'incomplete_expired'].includes(account.status))))
        throw new BillingError('You already have a paid or pending subscription. Manage Stripe billing below, or contact support to migrate legacy billing safely.', 409);
    const price = await stripe(env, `prices/${encodeURIComponent(selection.price)}`);
    if (env.STRIPE_REQUIRE_LIVE === 'true' && price.livemode !== true) throw new BillingError('Test prices are forbidden in production.');
    if (env.STRIPE_SANDBOX_ORIGIN && price.livemode !== false) throw new BillingError('Live prices are forbidden in sandbox.');
    if (!price.active || price.currency !== 'usd' || price.unit_amount !== selection.amount || price.type !== (selection.mode === 'subscription' ? 'recurring' : 'one_time') || (selection.interval && (price.recurring?.interval !== selection.interval || price.recurring.interval_count !== 1)))
        throw new BillingError('Stripe price configuration does not match this purchase. Please contact support.');
    const now = Math.floor(Date.now() / 1000), attempt = crypto.randomUUID();
    // Reserve one checkout per account for 32 minutes, longer than the 31-minute Checkout expiry.
    await db.prepare(`INSERT INTO stripe_checkout_locks (user_id, attempt, expires_at) VALUES (?, ?, ?)
 ON CONFLICT(user_id) DO UPDATE SET attempt=excluded.attempt, expires_at=excluded.expires_at WHERE stripe_checkout_locks.expires_at <= ?`).bind(user.id, attempt, now + 1920, now).run();
    const lock = await db.prepare('SELECT attempt FROM stripe_checkout_locks WHERE user_id = ?').bind(user.id).first<{
        attempt: string;
    }>();
    if (lock?.attempt !== attempt) {
        const pending = await db.prepare('SELECT id, price_id FROM vts_stripe_checkouts WHERE user_id = ? AND attempt = ?').bind(user.id, lock?.attempt ?? '').first<{
            id: string;
            price_id: string;
        }>();
        if (pending?.price_id === selection.price) {
            const session = await stripe(env, `checkout/sessions/${encodeURIComponent(pending.id)}`);
            if (session.status === 'open' && session.url && new URL(session.url).protocol === 'https:' && new URL(session.url).hostname === 'checkout.stripe.com')
                return { url: session.url, id: session.id, provider: 'stripe' };
        }
        throw new BillingError('A checkout is already pending. Resume the same purchase or wait 32 minutes before starting another.', 409);
    }
    try {
        const body = new URLSearchParams({ mode: selection.mode, 'line_items[0][price]': selection.price, 'line_items[0][quantity]': '1', client_reference_id: user.id, success_url: `${origin}/pricing?checkout=stripe-success`, cancel_url: `${origin}/pricing?checkout=cancelled`, expires_at: String(now + 1860), 'metadata[user_id]': user.id, 'metadata[price_id]': selection.price });
        // Sandbox verifies the app's existing hosted Checkout contract, not Managed Payments.
        if (env.STRIPE_SANDBOX_ORIGIN) body.set('managed_payments[enabled]', 'false');
        else if (env.STRIPE_MANAGED_PAYMENTS === 'true') body.set('managed_payments[enabled]', 'true');
        if (account?.customer_id)
            body.set('customer', account.customer_id);
        else
            body.set('customer_email', user.email);
        if (selection.mode === 'subscription') {
            body.set('subscription_data[metadata][user_id]', user.id);
            body.set('subscription_data[metadata][price_id]', selection.price);
        }
        const session = await stripe(env, 'checkout/sessions', body, `checkout-${attempt}`);
        if (!session.id || !session.url || new URL(session.url).protocol !== 'https:' || new URL(session.url).hostname !== 'checkout.stripe.com')
            throw new BillingError('Stripe did not return a valid checkout.', 502);
        await db.prepare('INSERT INTO vts_stripe_checkouts (id, user_id, price_id, mode, attempt) VALUES (?, ?, ?, ?, ?)').bind(session.id, user.id, selection.price, selection.mode, attempt).run();
        return { url: session.url, id: session.id, provider: 'stripe' };
    }
    catch (error) {
        // Retain reservation after ambiguous provider errors to prevent duplicate purchases.
        throw error;
    }
}
export async function createPortal(env: StripeEnv, user: BillingUser) {
    const origin = billingOrigin(env);
    const db = await database(env);
    const account = await db.prepare('SELECT customer_id FROM stripe_accounts WHERE user_id = ?').bind(user.id).first<{
        customer_id: string;
    }>();
    if (!account)
        throw new BillingError('No Stripe billing account. Legacy subscriptions must be managed with the original provider or through support.', 409);
    if (!env.STRIPE_PORTAL_CONFIGURATION_ID)
        throw new BillingError('Stripe billing management is not configured. Please contact support.');
    const configuration = await stripe(env, `billing_portal/configurations/${encodeURIComponent(env.STRIPE_PORTAL_CONFIGURATION_ID)}`) as StripeObject & {
        features?: {
            subscription_cancel?: {
                enabled: boolean;
                mode: string;
            };
            subscription_update?: {
                enabled: boolean;
            };
        };
    };
    if (!configuration.active || !configuration.features?.subscription_cancel?.enabled || configuration.features.subscription_cancel.mode !== 'at_period_end' || configuration.features.subscription_update?.enabled)
        throw new BillingError('Stripe portal configuration must allow cancellation at period end and disable plan changes. Please contact support.');
    const session = await stripe(env, 'billing_portal/sessions', new URLSearchParams({ customer: account.customer_id, configuration: env.STRIPE_PORTAL_CONFIGURATION_ID, return_url: `${origin}/pricing` }));
    if (!session.url || new URL(session.url).protocol !== 'https:' || new URL(session.url).hostname !== 'billing.stripe.com')
        throw new BillingError('Stripe did not return a valid billing portal.', 502);
    return { url: session.url };
}
export async function verifySignature(raw: string, header: string | null, secret: string, now = Math.floor(Date.now() / 1000)) {
    const parts = header?.split(',').map(s => s.trim().split('=')) ?? [];
    const timestamps = parts.filter(p => p[0] === 't');
    const timestamp = timestamps[0]?.[1];
    if (timestamps.length !== 1 || !timestamp || !/^\d+$/.test(timestamp) || Math.abs(now - Number(timestamp)) > 300)
        return false;
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    for (const [kind, value] of parts) {
        if (kind !== 'v1' || !/^[a-f0-9]{64}$/.test(value ?? ''))
            continue;
        const bytes = new Uint8Array(value.match(/../g)!.map(s => parseInt(s, 16)));
        if (await crypto.subtle.verify('HMAC', key, bytes, new TextEncoder().encode(`${timestamp}.${raw}`)))
            return true;
    }
    return false;
}
function selectionForPrice(env: StripeEnv, price: string) {
    for (const [key, details] of Object.entries(catalog))
        if (env[`STRIPE_${key}_PRICE_ID`] === price)
            return { ...details, price };
    throw new BillingError('Unrecognized Stripe price.', 400);
}
export async function handleWebhook(env: StripeEnv, raw: string, signature: string | null) {
    if (!env.STRIPE_WEBHOOK_SECRET)
        throw new BillingError('Stripe webhooks are not configured.');
    if (!await verifySignature(raw, signature, env.STRIPE_WEBHOOK_SECRET))
        throw new BillingError('Invalid Stripe signature.', 400);
    let event: {
        id: string;
        type: string;
        created: number;
        livemode: boolean;
        data: {
            object: StripeObject;
        };
    };
    try {
        event = JSON.parse(raw);
    }
    catch {
        throw new BillingError('Invalid Stripe payload.', 400);
    }
    if (!/^evt_[A-Za-z0-9]+$/.test(event.id ?? '') || !Number.isSafeInteger(event.created) || event.created < 0 || typeof event.type !== 'string' || typeof event.livemode !== 'boolean' || !event.data?.object?.id)
        throw new BillingError('Invalid Stripe event.', 400);
    if (env.STRIPE_REQUIRE_LIVE === 'true' && !event.livemode) throw new BillingError('Test events are forbidden in production.', 400);
    if (env.STRIPE_SANDBOX_ORIGIN && event.livemode) throw new BillingError('Live events are forbidden in sandbox.', 400);
    const db = await database(env);
    if (await db.prepare('SELECT id FROM vts_stripe_events WHERE id = ?').bind(event.id).first())
        return { ok: true, duplicate: true };
    const obj = event.data.object;
    const mutations: Statement[] = [];
    const token = crypto.randomUUID();
    const guard = 'EXISTS (SELECT 1 FROM vts_stripe_events WHERE id = ? AND token = ?)';
    if (['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) {
        const saved = await db.prepare('SELECT * FROM vts_stripe_checkouts WHERE id = ?').bind(obj.id).first<{
            user_id: string;
            price_id: string;
            mode: string;
            attempt: string;
        }>();
        if (!saved)
            throw new BillingError('Unknown checkout. Retry after checkout persistence or contact support.', 409);
        const session = await stripe(env, `checkout/sessions/${encodeURIComponent(obj.id)}?expand[]=line_items&expand[]=payment_intent.latest_charge`);
        const selection = selectionForPrice(env, saved.price_id);
        if (session.metadata?.user_id !== saved.user_id || session.mode !== saved.mode || session.line_items?.data.length !== 1 || session.line_items.data[0].price.id !== saved.price_id || session.line_items.data[0].quantity !== 1 || session.livemode !== event.livemode)
            throw new BillingError('Checkout verification failed.', 400);
        if (session.payment_status !== 'paid')
            return { ok: true, pending: true };
        if (session.mode === 'payment') {
            if (env.STRIPE_MANAGED_PAYMENTS === 'true' ? !((session.currency === 'usd' && session.amount_subtotal === selection.amount) || (session.currency_conversion?.source_currency === 'usd' && session.currency_conversion.amount_subtotal === selection.amount)) : (session.currency !== 'usd' || session.amount_total !== selection.amount))
                throw new BillingError('Checkout amount mismatch.', 400);
            const paidAt = session.payment_intent?.latest_charge?.created;
            if (session.payment_intent?.status !== 'succeeded' || !session.payment_intent.latest_charge?.paid || !Number.isSafeInteger(paidAt) || !paidAt || paidAt <= 0) throw new BillingError('Confirmed payment timestamp unavailable.', 409);
            const month = new Date(paidAt * 1000).toISOString().slice(0, 7), ref = `stripe_checkout_${session.id}`;
            mutations.push(db.prepare(`INSERT OR IGNORE INTO usage_records (id,user_id,month,minutes_used,minutes_limit,created_at,updated_at) SELECT ?,id,?,0,CASE WHEN EXISTS (SELECT 1 FROM stripe_accounts s WHERE s.user_id=users.id AND s.subscription_id IS NOT NULL AND (s.status <> 'active' OR s.paid_through <= unixepoch())) THEN 60 WHEN lower(trim(plan)) IN ('studio','business','team') THEN 3000 WHEN lower(trim(plan)) = 'pro' THEN 600 ELSE 60 END,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP FROM users WHERE id = ? AND ${guard}`).bind(`usage_${crypto.randomUUID()}`, month, saved.user_id, event.id, token));
            mutations.push(db.prepare(`INSERT OR IGNORE INTO stripe_quota_bases (user_id,month,plan_minutes) SELECT u.id,?,CASE WHEN s.status='active' AND s.paid_through>unixepoch() THEN CASE WHEN u.plan='studio' THEN 3000 WHEN u.plan='pro' THEN 600 ELSE 60 END ELSE 60 END FROM users u JOIN stripe_accounts s ON s.user_id=u.id WHERE u.id=? AND s.subscription_id IS NOT NULL AND ${guard}`).bind(month, saved.user_id, event.id, token));
            mutations.push(db.prepare(`INSERT OR IGNORE INTO credit_transactions (id,user_id,amount,type,description,created_at) SELECT ?,?,?, 'credit','Stripe extra transcription minutes',CURRENT_TIMESTAMP WHERE ${guard}`).bind(ref, saved.user_id, selection.minutes, event.id, token));
            mutations.push(db.prepare('UPDATE usage_records SET minutes_limit = minutes_limit + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND month = ? AND changes() = 1').bind(selection.minutes, saved.user_id, month));
        }
        else if (session.subscription)
            await subscriptionMutations(env, db, session.subscription, event, token, mutations, saved.user_id);
        if (session.customer)
            mutations.push(db.prepare(`INSERT INTO stripe_accounts (user_id,customer_id,status) SELECT ?,?,'none' WHERE ${guard} ON CONFLICT(user_id) DO NOTHING`).bind(saved.user_id, session.customer, event.id, token));
        mutations.push(db.prepare(`DELETE FROM stripe_checkout_locks WHERE user_id = ? AND attempt = ? AND ${guard}`).bind(saved.user_id, saved.attempt, event.id, token));
    }
    else if (['customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted'].includes(event.type)) {
        await subscriptionMutations(env, db, obj.id, event, token, mutations);
    }
    else if (['invoice.paid', 'invoice.payment_failed'].includes(event.type)) {
        // Basil invoices carry subscription in parent.subscription_details.
        const invoice = obj as StripeObject & {
            parent?: {
                subscription_details?: {
                    subscription?: string;
                };
            };
        };
        const sub = invoice.parent?.subscription_details?.subscription;
        if (sub)
            await subscriptionMutations(env, db, sub, event, token, mutations);
    }
    else
        return { ok: true, ignored: true };
    // D1 batch is a transaction. Unique event + token guard and unique purchase transaction
    // protect concurrent delivery, rollback, and distinct events for the same purchase.
    await db.batch([db.prepare('INSERT OR IGNORE INTO vts_stripe_events (id,token,created) VALUES (?, ?, ?)').bind(event.id, token, event.created), ...mutations]);
    return { ok: true };
}
async function subscriptionMutations(env: StripeEnv, db: BillingDB, id: string, event: {
    id: string;
    created: number;
    livemode: boolean;
}, token: string, mutations: Statement[], expectedUser?: string) {
    const observed = await db.prepare('SELECT mutation_token FROM stripe_accounts WHERE subscription_id = ? OR user_id = ?').bind(id, expectedUser ?? '').first<{ mutation_token: string }>();
    const sub = await stripe(env, `subscriptions/${encodeURIComponent(id)}?expand[]=latest_invoice`);
    const userId = sub.metadata?.user_id, priceId = sub.items?.data[0]?.price.id;
    if (!userId || !priceId || sub.items?.data.length !== 1 || !sub.customer || sub.livemode !== event.livemode || (expectedUser && expectedUser !== userId))
        throw new BillingError('Subscription verification failed.', 400);
    const selection = selectionForPrice(env, priceId);
    if (selection.mode !== 'subscription')
        throw new BillingError('Invalid subscription price.', 400);
    const existing = await db.prepare('SELECT * FROM stripe_accounts WHERE user_id = ?').bind(userId).first<{
        subscription_id: string | null;
        customer_id: string;
        status: string;
        event_created: number;
    }>();
    if (existing && existing.event_created > event.created)
        return;
    const user = await db.prepare('SELECT plan FROM users WHERE id = ?').bind(userId).first<{
        plan: string;
    }>();
    if (!user || (!existing?.subscription_id && user.plan !== 'free') || (existing?.subscription_id && existing.subscription_id !== id && !['canceled', 'incomplete_expired', 'none'].includes(existing.status)) || (existing && existing.customer_id !== sub.customer))
        throw new BillingError('Legacy or conflicting billing account requires support reconciliation.', 409);
    const paidThrough = sub.items?.data[0]?.current_period_end ?? sub.current_period_end ?? 0;
    const active = sub.status === 'active' && sub.latest_invoice?.status === 'paid' && paidThrough > Math.floor(Date.now() / 1000);
    const guard = 'EXISTS (SELECT 1 FROM vts_stripe_events WHERE id = ? AND token = ?)';
    // Strict ordering fails closed on seconds-level ties. The token binds every following
    // mutation to the account write that actually won inside this transaction.
    mutations.push(db.prepare(`INSERT INTO stripe_accounts (user_id,customer_id,subscription_id,status,event_created,mutation_token,paid_through)
 SELECT ?,?,?,?,?,?,? WHERE ${guard} AND EXISTS (SELECT 1 FROM users WHERE id = ? AND (plan = 'free' OR EXISTS (SELECT 1 FROM stripe_accounts WHERE user_id = users.id AND subscription_id IS NOT NULL)))
 ON CONFLICT(user_id) DO UPDATE SET subscription_id=excluded.subscription_id,status=excluded.status,event_created=excluded.event_created,mutation_token=excluded.mutation_token,paid_through=excluded.paid_through
 WHERE stripe_accounts.customer_id=excluded.customer_id
 AND (stripe_accounts.subscription_id IS NULL OR stripe_accounts.subscription_id=excluded.subscription_id OR stripe_accounts.status IN ('canceled','incomplete_expired','none'))
 AND (stripe_accounts.subscription_id IS NOT NULL OR EXISTS (SELECT 1 FROM users WHERE id = ? AND plan = 'free'))
 AND (? = 0 OR stripe_accounts.mutation_token = ?)
 AND (stripe_accounts.event_created < excluded.event_created OR (stripe_accounts.event_created = excluded.event_created AND ? = 0))`)
 .bind(userId, sub.customer, id, active || sub.status !== 'active' ? sub.status : 'inactive', event.created, token, active ? paidThrough : 0, event.id, token, userId, userId, active ? 1 : 0, observed?.mutation_token ?? '', active ? 1 : 0));
    const condition = `${guard} AND EXISTS (SELECT 1 FROM stripe_accounts WHERE user_id = ? AND subscription_id = ? AND event_created = ? AND mutation_token = ?)`;
    const month = new Date().toISOString().slice(0, 7);
    const previousMinutes = ['studio', 'business', 'team'].includes(user.plan.trim().toLowerCase()) ? 3000 : user.plan.trim().toLowerCase() === 'pro' ? 600 : 60;
    const nextMinutes = active ? selection.minutes : 60;
    mutations.push(db.prepare(`INSERT OR IGNORE INTO usage_records (id,user_id,month,minutes_used,minutes_limit,created_at,updated_at) SELECT ?,?,?,0,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP WHERE ${condition}`).bind(`usage_${crypto.randomUUID()}`, userId, month, previousMinutes, event.id, token, userId, id, event.created, token));
    // Track only the plan component. Provider grants, refunds, used minutes and all
    // pre-existing quota additions survive Stripe upgrades and downgrades.
    mutations.push(db.prepare(`INSERT OR IGNORE INTO stripe_quota_bases (user_id,month,plan_minutes) SELECT ?,?,? WHERE ${condition}`).bind(userId, month, previousMinutes, event.id, token, userId, id, event.created, token));
    mutations.push(db.prepare(`UPDATE usage_records SET minutes_limit = MAX(0, minutes_limit + ? - (SELECT plan_minutes FROM stripe_quota_bases WHERE user_id = ? AND month = ?)), updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND month = ? AND ${condition}`).bind(nextMinutes, userId, month, userId, month, event.id, token, userId, id, event.created, token));
    mutations.push(db.prepare(`UPDATE stripe_quota_bases SET plan_minutes = ? WHERE user_id = ? AND month = ? AND ${condition}`).bind(nextMinutes, userId, month, event.id, token, userId, id, event.created, token));
    mutations.push(db.prepare(`UPDATE users SET plan = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND ${condition}`).bind(active ? selection.plan : 'free', userId, event.id, token, userId, id, event.created, token));
}
