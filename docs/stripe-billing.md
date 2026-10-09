# Stripe billing migration

This repository implements new Stripe purchases. Production rollout on 2026-10-09 is tracked in the operator evidence report; authenticated browser verification remains a separate readiness checkpoint. The isolated 2026-10-09 test deployment is described below; it does not establish production readiness. Existing PayPal subscriptions are not canceled or transferred. Do not remove their credentials, webhook registrations or history.

## Architecture and quota contract

The UI calls local Next routes. Both development middleware and the production Cloudflare wrapper route Stripe requests to Next. These local routes enforce same-origin requests and proxy to the API Worker, which owns the live Stripe bindings and canonical webhook. The `/api/checkout` compatibility URL also uses Stripe. New PayPal checkout routes return 410. Local SRT import/editing is unchanged.

The frontend forwards a Bearer session or `vts_session` cookie to the API Worker, whose session middleware checks the signature, expiry and database account. The unsigned `videotosrt_email_session` cookie and browser user/plan metadata are never used to authorize Stripe billing. Mutating browser routes require a matching Origin. Redirects and query parameters never grant Stripe access. The anonymous OAuth bridge now requires a verified backend session and returns only that identity; it no longer writes client-supplied identities or creates an unsigned cookie. Unsigned email sessions return only a Free local identity with zero supplemental hours.

The backend inspected at `/root/videotosrt-backend` consumes `users.plan`, `usage_records.minutes_limit` and `usage_records.minutes_used`, and records debits/refunds in `credit_transactions`. Its signed ShipAny bridge grants current-month credits but does not synchronize plan/file entitlements; its grant implementation also has a nontransactional insert/update boundary. This integration therefore uses atomic D1 batches on the backend's database, rather than that bridge or a frontend-only membership flag. Backend quota and entitlement checks now read Stripe ownership and paid-through state, ignoring stale request plans for Stripe accounts. Backend changes must ship with this migration.

Both repository configurations currently name the same D1 database. This is configuration evidence only; deployed bindings still need verification. A separate frontend database cannot support this integration. `STRIPE_BILLING_SHARED_DB=true` is an operator assertion, not automatic detection. Missing bindings, missing tables, missing credentials or incompatible schema fail closed with a safe 503 message. No schema mutation is run on billing requests.

## Required setup

1. Back up the shared production D1 database and confirm the frontend's `DB` binding is the exact database used by the deployed transcription API. Preserve all users, existing usage and payment records. Confirm `users`, `usage_records` (unique user/month), and `credit_transactions` match the inspected backend migrations. Apply **only** `schema/stripe.sql` to that shared database. Do not replace backend tables with `schema/users.sql` or any frontend-only schema.
2. Create distinct, active USD Stripe prices below. IDs in `.env.example` are intentionally empty. Each price must use a fixed unit amount, one quantity, no metered usage, and one billing interval. Checkout validates the actual Stripe price before creating a session; no browser-supplied price or amount is accepted.

| Variable | Price | Stripe type | Allowance |
| --- | --- | --- | --- |
| `STRIPE_PRO_MONTHLY_PRICE_ID` | $9.90 | recurring, month × 1 | 600 minutes/calendar month, 180 minutes/file |
| `STRIPE_PRO_YEARLY_PRICE_ID` | $99.00 | recurring, year × 1 | same Pro allowance, replenished monthly |
| `STRIPE_STUDIO_MONTHLY_PRICE_ID` | $29.90 | recurring, month × 1 | 3000 minutes/calendar month, 360 minutes/file |
| `STRIPE_STUDIO_YEARLY_PRICE_ID` | $299.00 | recurring, year × 1 | same Studio allowance, replenished monthly |
| `STRIPE_CREDITS_2H_PRICE_ID` | $5.00 | one-time | 120 extra minutes |
| `STRIPE_CREDITS_5H_PRICE_ID` | $12.00 | one-time | 300 extra minutes |
| `STRIPE_CREDITS_20H_PRICE_ID` | $39.00 | one-time | 1200 extra minutes |

3. Configure Worker secrets `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` using a secure secret-input mechanism. Configure the seven price bindings, `STRIPE_PORTAL_CONFIGURATION_ID`, and `STRIPE_BILLING_SHARED_DB=true` only once the DB/schema have been verified. `.env.example` lists names; a Next `.env.local` file alone does not configure deployed Cloudflare Worker bindings. Never put secret values in source, logs, build output, screenshots, chat or public environment variables. A publishable key is unnecessary for hosted Checkout.
4. API requests pin `Stripe-Version: 2025-06-30.basil`. Register a **snapshot** webhook using that version at `https://videotosrt.org/api/webhooks/stripe`, from your own Stripe account, for these events:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Create an active Stripe billing portal configuration. Enable subscription cancellation with **`at_period_end`** and disable subscription updates/plan switching. Enable payment-method management and invoice history as desired. The portal route retrieves and verifies cancellation settings before returning a customer-owned portal session; it refuses immediate cancellation configurations and enabled plan changes. Store its ID in `STRIPE_PORTAL_CONFIGURATION_ID`. New plan changes require a separate reviewed implementation; they are not exposed by this UI.
6. Test in Stripe test mode against an isolated DB and test products before enabling live keys. All IDs, keys and webhook secrets must belong to the same mode/account. Production return URLs target `https://videotosrt.org/pricing`; the guarded sandbox origin overrides them in the private harness. do not make a production payment to test a localhost checkout. Stripe CLI forwarding uses its own signing secret, distinct from the deployed endpoint's secret.

## Implemented behavior

- One pending Checkout session per authenticated user prevents repeated clicks from creating multiple purchases. Checkout expires after 31 minutes (including a margin above Stripe’s 30-minute minimum); the reservation lasts 32 minutes. Repeating the same purchase resumes the saved open session. A different purchase waits for completion or reservation expiry. Ambiguous network/persistence failures retain the reservation to avoid duplicate purchases; inspect Stripe/D1 before recovering it manually. Checkout POSTs carry a server-generated Stripe idempotency key.
- Only signed raw-body events with a signature timestamp within five minutes are accepted. Verification uses Web Crypto HMAC, accepts rotated `v1` signatures and checks them in constant time. An event ID is recorded in the same D1 transaction as entitlement changes. Concurrent retries cannot grant twice; transaction failures roll back the event marker and changes, permitting retry. Credit grants also use a unique Checkout-session transaction ID, preventing two different events from granting the same purchase.
- Fulfillment retrieves the current Stripe session/subscription, checks ownership, the saved allowlisted price, quantity, payment state, and mode. One-time purchases also verify exact USD amount. An active subscription requires its latest invoice status to be `paid` (Basil does not expose the old invoice `paid` boolean). No trial entitlement is granted. `past_due`, unpaid, paused, canceled and incomplete states receive the Free plan; customer payment recovery returns paid access after verified events. Configure Stripe retries/collection behavior accordingly.
- Scheduling cancellation retains active paid access until the subscription ends. The deletion/update webhook then downgrades the account. Backend checks also expire paid access and subtract only the tracked plan quota after paid-through, even if that webhook is lost. Older events cannot overwrite a newer recorded subscription state. Paid grants reject same-second ties; revocations can win ties. A compare-and-swap token prevents a provider snapshot fetched before a concurrent account change from restoring access. Tied paid recovery requires a later verified provider event or support reconciliation; availability is deliberately sacrificed to prevent unauthorized access. The implementation retrieves current Stripe state instead of trusting stale event snapshots. Endpoint failures are retried by Stripe; monitor them and replay failed deliveries after correcting configuration. Keep event/checkout records for replay protection.
- Plan changes update `users.plan` and the current UTC calendar-month quota atomically. `stripe_quota_bases` tracks only the plan component: existing bonus allowances, credit grants, refunds and minutes already consumed remain intact. Monthly creation/reset continues to be handled by the existing backend, including annual subscribers. A downgrade may leave used minutes above the new allowance; it never erases usage.
- **New extra minutes expire at the end of the UTC calendar month in which payment is confirmed.** They are added to the quota consumed by transcription, not a disconnected frontend `extra_credit_hours` counter. This replaces the old unsupported “never expire” claim. No promise of rollover is made. Existing historical credit balances are not deleted or reinterpreted by this migration.
- Refund requests are handled through support; automatic refunds, chargeback clawback and tax calculation are not implemented. Checkout does not enable coupons, automatic tax or adjustable quantities. Configure Stripe tax/legal requirements before activation if needed; that may require reviewed implementation changes.

## Legacy handling

Existing PayPal subscribers continue to be billed by PayPal. Once an account has a recorded Stripe subscription, legacy sync/webhook entitlement updates are prevented from overwriting its Stripe-managed plan, including after Stripe cancellation. This does not cancel legacy charges; support must still reconcile the old subscription. This migration never calls cancellation APIs, edits PayPal subscriptions or automatically moves users to Stripe. Existing PayPal credentials and configured plan bindings in `wrangler.jsonc` must remain available. Retain both historic webhook URLs and pending return handlers:

- `/api/webhooks/paypal` retains the existing frontend entitlement handler.
- `/api/paypal/webhook` retains the historic verified forwarding behavior.
- `/api/checkout/paypal/sync` retains server verification of a returning legacy subscription.
- `/api/checkout/paypal/credits/capture` retains completion of purchases initiated before migration.
- Old new-purchase URLs `/api/checkout/paypal` and `/api/checkout/paypal/credits` return 410, asking users to reload pricing.

Paid or pending subscribers cannot create a second Stripe subscription from pricing. Legacy users receive a support message and retain their current membership. Stripe's portal cannot cancel a PayPal/Creem subscription. Support must verify the original subscription, account identity, payment history, balances and cancellation/end date with the customer before any manual migration. Wait for the original provider's final events and paid period to finish; then reconcile membership and enable Stripe checkout. Never merely set a legacy paid account to Free while its old subscription still renews. Any backend Creem subscribers are also treated as legacy; the old backend route is not used by the frontend.

## Validation and live activation blockers

Run `npm test`, `npm run lint`, `npm run typecheck`, and `npm run build` (includes SEO checks). Stripe tests use synthetic fixtures and a real in-memory SQLite transactional adapter; they do not create real Stripe products or payments. They cover signatures/replay windows, auth, price allowlisting, ownership, unpaid purchases, concurrent duplicates, rollback/retry, checkout reuse, lifecycle quotas, stale events, legacy protection and portal configuration.

Activation is blocked until real test/live credentials and all seven products/prices exist; the portal is configured; deployed shared DB/schema are verified and migration applied; the signed endpoint is registered; and real test-mode end-to-end purchases, webhook replay, renewals, failure/recovery, month rollover, portal cancellation and transcription quota consumption pass. Local `.env.local` contained no Stripe variable names at inspection. Remote secret inventory and live account state were not inspected. The old implementation has no complete local PayPal subscription registry; audit the provider inventory against user plans before activation, especially paid subscriptions whose local plan may have been lost. No live readiness is claimed.

Stripe references: [webhook signatures and retries](https://docs.stripe.com/webhooks), [Checkout Sessions](https://docs.stripe.com/api/checkout/sessions/create), [customer portal](https://docs.stripe.com/customer-management), [Basil invoice fields](https://docs.stripe.com/api/invoices/object?api-version=2025-06-30.basil).

## Security rollout blockers

Token-only session completion now fails closed and backend callbacks require the initiating-browser state cookie. The legitimate cross-host handoff still needs a one-time browser-bound exchange and browser verification before rollout. Test Stripe resources are configured for the isolated harness; provider-backed completed payments remain pending browser action.

`vts_stripe_events` is intentionally distinct from backend `stripe_events`. Fresh-schema tests apply backend `0001_init.sql` followed by `schema/stripe.sql`. If an earlier draft Stripe schema was applied anywhere, this CREATE-only migration is insufficient for added account columns; inspect and prepare an explicit upgrade before activation. No production schema was inspected or changed. Legacy PayPal plan SQL requires the Stripe schema to be installed before serving these handlers.

## Isolated sandbox verification (2026-10-09)

`wrangler.stripe-sandbox.json` deploys only `sandbox/worker.ts`, with no routes,
assets, production API proxy, PayPal credentials, OAuth credentials, queues, R2,
or production DB bindings. The private harness reuses `lib/stripe.ts` and binds a
new isolated D1 database. Its fixed test identity is authorized by a random
operator password, checked on every non-webhook request; it is not a public auth
bypass. Webhooks remain public but require Stripe raw-body signatures, reject
live events, and retrieve provider state before granting entitlements. Sandbox
return URLs are allowed only with a test secret key and an HTTPS workers.dev
origin. The original app and its pricing/account components are not deployed by
this harness and must not be described as browser verified.

Local auth fixes now reject OAuth callbacks with missing/mismatched state cookies,
require same-origin bridge/session-completion POSTs, and use HttpOnly/Lax session
cookies. Session completion also rejects a token unless it matches an existing
session cookie on the frontend host. This deliberately fails closed for the old
cross-host token-only handoff. A one-time exchange bound to a frontend initiating
browser is still required before that flow can be enabled. Origin checking alone
would not prevent an attacker sending a victim a same-origin token URL.

A full isolated Google flow requires a separate OAuth client's authorized redirect
URI `https://<sandbox-backend>.workers.dev/api/auth/callback/google`, sandbox
GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET, sandbox GOOGLE_REDIRECT_URI and APP_ORIGIN,
plus replacing the frontend's hardcoded production login/auth hosts and implementing
the one-time frontend handoff. Initiation and callback must use the same host so
the host-only state cookie survives. No OAuth console configuration or production
credentials were changed. Details and browser Checkout continuation instructions
are recorded privately in `/tmp/vts-sandbox-report.md`.

The sandbox browser tests completed Pro monthly and the 2-hour pack through hosted
Stripe Checkout with a test card. Real signed deliveries updated isolated D1 to
Pro/600 minutes, then Pro/720 minutes with one 120-minute credit transaction.
Provider-generated event resends returned duplicate=true without changing those
balances. The portal scheduled cancellation at period end and retained paid access.
These checkpoints verify the private provider harness, not Google OAuth, the
original React pricing/account UI, or production readiness.

Remote execution also found that Workers rejects redirect:error; provider/auth
fetches now use redirect:manual and reject non-success responses. The test Stripe
account defaults to Managed Payments and the reused products lack tax codes.
Only sandbox Checkout sessions explicitly pass managed_payments[enabled]=false.
No account setting, product, price, or production behavior was changed. The live
account's Managed Payments/tax contract remains a production prerequisite.


## Production release 2026-10-09

The live catalog uses Managed Payments with eligible cloud AI service tax codes. USD base prices are validated separately from tax and currency conversion. Production rejects test prices and test events. Existing PayPal handlers, credentials and paid accounts remain intact; subscriptions are not migrated automatically.

OAuth begins at the local `/api/auth/login`, sets a host-only HttpOnly random verifier, and redirects to the API domain that also receives the Google callback. The signed state retains a SHA-256 verifier challenge. The mandatory API state cookie is checked before provider exchange. The callback returns a 60-second signed handoff in a fragment, with issuer, exact audience, purpose, account, challenge, expiry and nonce. Local same-origin completion sends the verifier only server-to-server. The API atomically claims the nonce in D1 and issues a session only once. A different existing account or expired session rejects the exchange. URL credentials never establish sessions.

The additive migration uses `vts_stripe_checkouts`; the older incompatible `stripe_checkouts` is preserved. Back up shared D1 before applying the two new migrations. Backend billing source is identical to the frontend portable engine exercised by the provider and unit suite. CI validates both branches; verified operator OAuth deploys production with `env -u CLOUDFLARE_API_TOKEN npx wrangler deploy`.

Release evidence and remaining verification requirements are recorded in `/tmp/vts-production-report.md`. An unpaid provider preflight does not establish authenticated application checkout, Google callback completion, or signed paid webhook entitlement verification.
