import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHmac } from 'node:crypto';
import { resolveSelection, verifySignature, authenticate, createCheckout, createPortal, handleWebhook } from '../lib/stripe.ts';
const env = { STRIPE_SECRET_KEY: 'test-fixture', STRIPE_WEBHOOK_SECRET: 'fixture-signing', STRIPE_PRO_MONTHLY_PRICE_ID: 'price_fixture', STRIPE_BILLING_SHARED_DB: 'true' };
test('price selection rejects raw prices, unknown plans and billing; missing config fails safely', () => {
 assert.throws(() => resolveSelection(env, {price: 'price_attacker'}), /Invalid/);
 assert.throws(() => resolveSelection(env, {plan:'pro', billing:'weekly'}), /Invalid/);
 assert.throws(() => resolveSelection(env, {plan:'studio', billing:'yearly'}), /configured/);
 assert.equal(resolveSelection(env, {plan:'pro',billing:'monthly'}).price, 'price_fixture');
});
test('raw-body signatures reject tampering, expired/future timestamp, wrong secret, malformed headers', async () => {
 const body='{"id":"evt_fixture"}', now=1700000000;
 const sign=(t)=>`t=${t},v1=${createHmac('sha256','fixture-signing').update(`${t}.${body}`).digest('hex')}`;
 assert.equal(await verifySignature(body, sign(now), 'fixture-signing', now), true);
 for(const [b,s] of [[body+' ',sign(now)],[body,sign(now-301)],[body,sign(now+301)],[body,'bad']]) assert.equal(await verifySignature(b,s,'fixture-signing',now),false);
 assert.equal(await verifySignature(body,sign(now),'wrong',now),false);
 assert.equal(await verifySignature(body,sign(now)+',v1=bad','fixture-signing',now),true);
});
test('billing never accepts an unsigned local email identity and forwards only session credentials', async () => {
 let headers;
 const fetcher=async (url,init)=>{headers=init.headers; return Response.json({user:{id:'u1',email:'u@example.com'}});};
 const req=new Request('https://videotosrt.org/api/checkout/stripe',{headers:{cookie:'videotosrt_email_session=forged', 'x-attacker':'bad'}});
 assert.equal(await authenticate(req,fetcher),null);
 const user=await authenticate(new Request(req.url,{headers:{authorization:'Bearer fixture'}}),fetcher);
 assert.equal(user.id,'u1'); assert.equal(headers.get('x-attacker'),null); assert.equal(headers.get('cookie'),null);
});
test('checkout refuses incomplete shared database configuration before calling Stripe',async()=>{
 await assert.rejects(createCheckout(env,{id:'u1',email:'u@example.com'}, {plan:'pro',billing:'monthly'}), /configured/);
});
test('webhook rejects invalid signature before database writes',async()=>{
 await assert.rejects(handleWebhook(env,'{}','bad'), /signature/);
});

import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
function fixture() {
 const sql=new DatabaseSync(':memory:');
 sql.exec(readFileSync(`${process.env.VTS_BACKEND_DIR ?? '../videotosrt-backend'}/migrations/0001_init.sql`,'utf8'));
 sql.exec(readFileSync('schema/stripe.sql','utf8'));
 sql.exec("INSERT INTO users (id,email,provider,provider_id,plan,created_at,updated_at) VALUES ('u1','u@example.com','google','g1','free','now','now')");
 const db={prepare(query){let values=[];return {bind(...v){values=v;return this;},async first(){return sql.prepare(query).get(...values)??null;},async all(){return {results:sql.prepare(query).all(...values)};},async run(){return sql.prepare(query).run(...values);},execute(){return sql.prepare(query).run(...values);}};},async batch(statements){sql.exec('BEGIN');try {const results=statements.map(s=>s.execute());sql.exec('COMMIT');return results;}catch(e){sql.exec('ROLLBACK');throw e;}}};
 return {sql,env:{...env,DB:db,STRIPE_CREDITS_2H_PRICE_ID:'price_credits'},db};
}
const signedEvent=(id,type,object,created=Math.floor(Date.now()/1000))=>{
 const raw=JSON.stringify({id,type,created,livemode:false,data:{object}}), ts=Math.floor(Date.now()/1000);
 return [raw,`t=${ts},v1=${createHmac('sha256','fixture-signing').update(`${ts}.${raw}`).digest('hex')}`];
};
const month=()=>new Date().toISOString().slice(0,7);
const paidSession={id:'cs_fixture',mode:'payment',payment_status:'paid',payment_intent:{status:'succeeded',latest_charge:{paid:true,created:Math.floor(Date.now()/1000)}},customer:'cus_fixture',currency:'usd',amount_total:500,livemode:false,metadata:{user_id:'u1'},line_items:{data:[{price:{id:'price_credits'},quantity:1}]}};
const paidSub={id:'sub_fixture',status:'active',current_period_end:Math.floor(Date.now()/1000)+86400,customer:'cus_fixture',livemode:false,metadata:{user_id:'u1'},items:{data:[{price:{id:'price_fixture'}}]},latest_invoice:{id:'in_fixture',status:'paid'}};
async function mockStripe(object,fn) {
 const previous=globalThis.fetch;globalThis.fetch=async()=>Response.json(object);
 try {return await fn();} finally {globalThis.fetch=previous;}
}
test('concurrent and distinct credit events grant one purchase once',async()=>{
 const {sql,env}=fixture();sql.exec("INSERT INTO vts_stripe_checkouts VALUES ('cs_fixture','u1','price_credits','payment','attempt')");
 await mockStripe(paidSession,async()=>{
 const delivery=signedEvent('evt_credits','checkout.session.completed',{id:'cs_fixture'});
 await Promise.all([handleWebhook(env,...delivery),handleWebhook(env,...delivery)]);
 await handleWebhook(env,...signedEvent('evt_async','checkout.session.async_payment_succeeded',{id:'cs_fixture'}));
 });
 assert.equal(sql.prepare('SELECT minutes_limit FROM usage_records').get().minutes_limit,180);
 assert.equal(sql.prepare('SELECT count(*) n FROM credit_transactions').get().n,1);
});
test('failed transaction rolls back event and credits; retry grants once',async()=>{
 const {sql,env,db}=fixture();sql.exec("INSERT INTO vts_stripe_checkouts VALUES ('cs_fixture','u1','price_credits','payment','attempt')");
 const original=db.batch;db.batch=async s=>original([...s,db.prepare('INSERT INTO nonexistent VALUES (1)')]);
 const event=signedEvent('evt_retry','checkout.session.completed',{id:'cs_fixture'});
 await mockStripe(paidSession,async()=>{
 await assert.rejects(handleWebhook(env,...event));
 assert.equal(sql.prepare('SELECT count(*) n FROM vts_stripe_events').get().n,0);
 db.batch=original;await handleWebhook(env,...event);
 });
 assert.equal(sql.prepare('SELECT minutes_limit FROM usage_records').get().minutes_limit,180);
});
test('unpaid, mismatched price and foreign-user sessions never grant credits',async()=>{
 for(const session of [{...paidSession,payment_status:'unpaid'},{...paidSession,metadata:{user_id:'attacker'}},{...paidSession,line_items:{data:[{price:{id:'price_attacker'},quantity:1}]}}]) {
 const {sql,env}=fixture();sql.exec("INSERT INTO vts_stripe_checkouts VALUES ('cs_fixture','u1','price_credits','payment','attempt')");
 await mockStripe(session,async()=>{try{await handleWebhook(env,...signedEvent('evt_unpaid','checkout.session.completed',{id:'cs_fixture'}));}catch(e){assert.match(e.message,/verification/);}});
 assert.equal(sql.prepare('SELECT count(*) n FROM credit_transactions').get().n,0);
 }
});
test('subscription upgrades and cancellation preserve used minutes and legacy bonus credits',async()=>{
 const {sql,env}=fixture();sql.prepare('INSERT INTO usage_records VALUES (?,?,?,?,?,?,?)').run('usage1','u1',month(),25,90,'now','now');
 await mockStripe(paidSub,()=>handleWebhook(env,...signedEvent('evt_active','customer.subscription.updated',{id:'sub_fixture'},100)));
 assert.equal(sql.prepare('SELECT plan FROM users').get().plan,'pro');
 assert.equal(sql.prepare('SELECT minutes_limit FROM usage_records').get().minutes_limit,630);
 await mockStripe({...paidSub,status:'canceled'},()=>handleWebhook(env,...signedEvent('evt_cancel','customer.subscription.deleted',{id:'sub_fixture'},101)));
 assert.equal(sql.prepare('SELECT plan FROM users').get().plan,'free');
 const quota=sql.prepare('SELECT * FROM usage_records').get();assert.equal(quota.minutes_limit,90);assert.equal(quota.minutes_used,25);
 // Older paid event cannot restore the canceled plan.
 await mockStripe(paidSub,()=>handleWebhook(env,...signedEvent('evt_old','customer.subscription.updated',{id:'sub_fixture'},99)));
 assert.equal(sql.prepare('SELECT plan FROM users').get().plan,'free');
});
test('active unpaid invoice and past-due subscriptions have no paid access; scheduled cancellation retains paid access',async()=>{
 for(const [sub,expected] of [[{...paidSub,latest_invoice:{id:'in_fixture',status:'open'}},'free'],[{...paidSub,status:'past_due'},'free'],[{...paidSub,cancel_at_period_end:true},'pro']]){
 const {sql,env}=fixture();await mockStripe(sub,()=>handleWebhook(env,...signedEvent('evt_status','customer.subscription.updated',{id:'sub_fixture'})));
 assert.equal(sql.prepare('SELECT plan FROM users').get().plan,expected);
 }
});
test('legacy subscribers cannot be overwritten by a Stripe subscription',async()=>{
 const {sql,env}=fixture();sql.exec("UPDATE users SET plan='studio'");
 await mockStripe(paidSub,()=>assert.rejects(handleWebhook(env,...signedEvent('evt_legacy','customer.subscription.updated',{id:'sub_fixture'})),/Legacy/));
 assert.equal(sql.prepare('SELECT plan FROM users').get().plan,'studio');
});

test('checkout is owned by server-authenticated user and pending clicks reuse one Stripe session',async()=>{
 const {sql,env}=fixture();env.STRIPE_PORTAL_CONFIGURATION_ID='bpc_fixture';const previous=globalThis.fetch;let posts=0,posted;
 globalThis.fetch=async(url,init)=>{
  if(url.includes('/prices/')) return Response.json({active:true,currency:'usd',unit_amount:990,type:'recurring',recurring:{interval:'month',interval_count:1}});
  if(init.method==='POST') {posts++;posted=init.body;assert.match(init.headers['Idempotency-Key'],/^checkout-/);}
  return Response.json({id:'cs_purchase',url:'https://checkout.stripe.com/c/pay_fixture',status:'open'});
 };
 try {
  const user={id:'u1',email:'u@example.com'};
  const first=await createCheckout(env,user,{plan:'pro',billing:'monthly'});
  const second=await createCheckout(env,user,{plan:'pro',billing:'monthly'});
  assert.equal(posts,1);assert.equal(first.url,second.url);
  assert.ok(Number(posted.get('expires_at')) >= Math.floor(Date.now()/1000)+1850, 'expiry includes transport margin above Stripe minimum');
  assert.equal(posted.get('client_reference_id'),'u1');assert.equal(posted.get('line_items[0][price]'),'price_fixture');
  assert.equal(sql.prepare('SELECT user_id FROM vts_stripe_checkouts').get().user_id,'u1');
 } finally {globalThis.fetch=previous;}
});
test('wrong live price amount blocks checkout before reservation or provider session',async()=>{
 const {sql,env}=fixture();env.STRIPE_PORTAL_CONFIGURATION_ID='bpc_fixture';await mockStripe({active:true,currency:'usd',unit_amount:1,type:'recurring',recurring:{interval:'month',interval_count:1}},()=>assert.rejects(createCheckout(env,{id:'u1',email:'u@example.com'},{plan:'pro'}),/configuration/));
 assert.equal(sql.prepare('SELECT count(*) n FROM stripe_checkout_locks').get().n,0);
});
test('portal rejects configuration that cancels immediately',async()=>{
 const {sql,env}=fixture();sql.exec("INSERT INTO stripe_accounts (user_id,customer_id,status) VALUES ('u1','cus_fixture','active')");
 env.STRIPE_PORTAL_CONFIGURATION_ID='bpc_fixture';
 await mockStripe({id:'bpc_fixture',active:true,features:{subscription_cancel:{enabled:true,mode:'immediately'}}},()=>assert.rejects(createPortal(env,{id:'u1',email:'u@example.com'}),/configuration/));
});
test('login persistence preserves backend auth provider and server membership remains authoritative',()=>{
 const store=readFileSync('lib/user-store.ts','utf8');const login=store.slice(store.indexOf('export async function upsertUserLogin'),store.indexOf('export async function getStoredUserMembership'));
 assert.doesNotMatch(login,/SET provider = excluded.provider|SET provider_id = excluded.provider_id/);
 assert.doesNotMatch(readFileSync('app/api/auth/me/route.ts','utf8'),/await upsertUserLogin|await getStoredUserMembership/);
});

test('selection requires primitive values and distinct configured price IDs',()=>{
 assert.throws(()=>resolveSelection(env,{plan:['pro'],billing:'monthly'}),/Invalid/);
 assert.throws(()=>resolveSelection({...env,STRIPE_STUDIO_MONTHLY_PRICE_ID:'price_fixture'},{plan:'pro',billing:'monthly'}),/distinctly/);
});
test('production and development routing retain Stripe routes and historic PayPal forwarding',()=>{
 for(const route of ['/api/checkout/stripe','/api/checkout/stripe/credits','/api/billing/portal','/api/webhooks/stripe']) {
  assert.ok(readFileSync('worker.ts','utf8').includes(route));assert.ok(readFileSync('middleware.ts','utf8').includes(route));
 }
 const legacy=readFileSync('app/api/paypal/webhook/route.ts','utf8');assert.match(legacy,/verifyPaypalWebhook/);assert.match(legacy,/forwardWebhook/);assert.doesNotMatch(legacy,/updateUserPlan/);
 const stripeReturn=readFileSync('components/sections/pricing-client.tsx','utf8').split('if (checkoutState === "stripe-success")')[1].split('if (checkoutState === "success")')[0];
 assert.doesNotMatch(stripeReturn,/setLocalUser\(|setUser\(|plan:/);
});
test('subscriptions refuse missing portal configuration before creating checkout',async()=>{
 const {env}=fixture();await assert.rejects(createCheckout(env,{id:'u1',email:'u@example.com'},{plan:'pro'}),/management.*configured/);
});
test('production historic PayPal forwarding URL is not rewritten to the entitlement webhook',()=>{
 assert.doesNotMatch(readFileSync('worker.ts','utf8'),/new URL\("\/api\/webhooks\/paypal"/);
});
test('historic forwarding endpoint preserves its live environment default',()=>{
 assert.match(readFileSync('app/api/paypal/webhook/route.ts','utf8'),/PAYPAL_ENVIRONMENT: env.PAYPAL_ENVIRONMENT \?\? "live"/);
});
test('Basil invoice status grants paid access without the removed paid boolean',async()=>{
 const {sql,env}=fixture();await mockStripe({...paidSub,latest_invoice:{id:'in_fixture',status:'paid'}},()=>handleWebhook(env,...signedEvent('evt_basil','customer.subscription.updated',{id:'sub_fixture'})));
 assert.equal(sql.prepare('SELECT plan FROM users').get().plan,'pro');
});

test('same-second cancellation wins in either delivery order and stale concurrent snapshots cannot restore access',async()=>{
 for (const reversed of [false,true]) {
  const {sql,env}=fixture();
  await mockStripe(paidSub,()=>handleWebhook(env,...signedEvent('evt_start','customer.subscription.updated',{id:paidSub.id},100)));
  const deliveries=[['evt_stop',{...paidSub,status:'canceled'}],['evt_tie',paidSub]];
  if(reversed) deliveries.reverse();
  for(const [id,sub] of deliveries) await mockStripe(sub,()=>handleWebhook(env,...signedEvent(id,'customer.subscription.updated',{id:paidSub.id},101)));
  assert.equal(sql.prepare('SELECT plan FROM users').get().plan,'free');
 }
});
test('credit month comes from confirmed charge timestamp across month boundaries and retries',async()=>{
 const {sql,env}=fixture();sql.exec("INSERT INTO vts_stripe_checkouts VALUES ('cs_fixture','u1','price_credits','payment','attempt')");
 const session={...paidSession,payment_intent:{status:'succeeded',latest_charge:{paid:true,created:Date.parse('2026-06-30T23:59:59Z')/1000}}};
 await mockStripe(session,async()=>{
  await handleWebhook(env,...signedEvent('evt_month','checkout.session.completed',{id:session.id}));
  await handleWebhook(env,...signedEvent('evt_monthretry','checkout.session.completed',{id:session.id}));
 });
 assert.equal(sql.prepare('SELECT month FROM usage_records').get().month,'2026-06');
 assert.equal(sql.prepare('SELECT minutes_limit FROM usage_records').get().minutes_limit,180);
});
test('ownership changing while provider fetch is in flight blocks Stripe grant atomically',async()=>{
 const {sql,env}=fixture();const previous=globalThis.fetch;
 globalThis.fetch=async()=>{sql.exec("UPDATE users SET plan='studio'");return Response.json(paidSub);};
 try{await assert.rejects(handleWebhook(env,...signedEvent('evt_owner','customer.subscription.updated',{id:paidSub.id})),/Legacy/);}finally{globalThis.fetch=previous;}
 assert.equal(sql.prepare('SELECT count(*) n FROM stripe_accounts').get().n,0);
});
test('concurrent stale paid snapshot cannot undo cancellation even with a later event second',async()=>{
 const {sql,env}=fixture();
 await mockStripe(paidSub,()=>handleWebhook(env,...signedEvent('evt_initial','customer.subscription.updated',{id:paidSub.id},100)));
 const previous=globalThis.fetch;let release, started;
 const ready=new Promise(r=>started=r);
 globalThis.fetch=async()=>{started();await new Promise(r=>release=r);return Response.json(paidSub);};
 const stale=handleWebhook(env,...signedEvent('evt_staleconcurrent','customer.subscription.updated',{id:paidSub.id},102));
 await ready;
 globalThis.fetch=async()=>Response.json({...paidSub,status:'canceled'});
 try {
  await handleWebhook(env,...signedEvent('evt_concurrentcancel','customer.subscription.deleted',{id:paidSub.id},101));
  release();await stale;
  assert.equal(sql.prepare('SELECT plan FROM users').get().plan,'free');
  assert.equal(sql.prepare('SELECT paid_through FROM stripe_accounts').get().paid_through,0);
 } finally {globalThis.fetch=previous;}
});
test('PayPal SQL atomically excludes Stripe accounts by ID and email',()=>{
 const {sql}=fixture();
 const source=readFileSync('lib/paypal.ts','utf8');
 const queries=[...source.matchAll(/\.prepare\("(UPDATE users SET plan = \? WHERE (?:id|email) = \?[^"\n]+)"\)/g)].map(m=>m[1]);
 assert.equal(queries.length,4);
 sql.exec("INSERT INTO stripe_accounts (user_id,customer_id,subscription_id) VALUES ('u1','cus_guard','sub_guard')");
 for(const query of queries) {
  sql.prepare(query).run('studio',query.includes('WHERE email')?'u@example.com':'u1');
  assert.equal(sql.prepare('SELECT plan FROM users').get().plan,'free');
 }
});

test('credit-only Stripe customer preserves legacy PayPal membership updates',()=>{
 const {sql}=fixture();
 sql.exec("INSERT INTO stripe_accounts (user_id,customer_id) VALUES ('u1','cus_credits')");
 const source=readFileSync('lib/paypal.ts','utf8');
 const queries=[...source.matchAll(/\.prepare\("(UPDATE users SET plan = \? WHERE (?:id|email) = \?[^"\n]+)"\)/g)].map(m=>m[1]);
 for(const query of queries)sql.prepare(query).run('pro',query.includes('WHERE email')?'u@example.com':'u1');
 assert.equal(sql.prepare('SELECT plan FROM users').get().plan,'pro');
});
test('sandbox return origin fails closed for live keys, production hosts and malformed origins', async () => {
 for (const config of [
  {STRIPE_SECRET_KEY:'sk_live_fixture',STRIPE_SANDBOX_ORIGIN:'https://sandbox.workers.dev'},
  {STRIPE_SECRET_KEY:'sk_test_fixture',STRIPE_SANDBOX_ORIGIN:'https://videotosrt.org'},
  {STRIPE_SECRET_KEY:'sk_test_fixture',STRIPE_SANDBOX_ORIGIN:'http://sandbox.workers.dev'},
  {STRIPE_SECRET_KEY:'sk_test_fixture',STRIPE_SANDBOX_ORIGIN:'https://sandbox.workers.dev/path'},
 ]) await assert.rejects(createCheckout({...env,...config},{id:'u1',email:'u@example.com'},{plan:'pro'}),/Invalid sandbox/);
});
test('sandbox refuses genuine signed live events before database access', async () => {
 const raw=JSON.stringify({id:'evt_live',type:'customer.subscription.created',created:Math.floor(Date.now()/1000),livemode:true,data:{object:{id:'sub_live'}}});
 const ts=Math.floor(Date.now()/1000),signature=`t=${ts},v1=${createHmac('sha256','fixture-signing').update(`${ts}.${raw}`).digest('hex')}`;
 await assert.rejects(handleWebhook({...env,STRIPE_SANDBOX_ORIGIN:'https://sandbox.workers.dev'},raw,signature),/Live events are forbidden/);
});

test('session authentication uses Workers-compatible manual redirects and refuses redirected identities', async () => {
 const request=new Request('https://videotosrt.org/api/checkout',{headers:{authorization:'Bearer fixture'}});
 const user=await authenticate(request,async(url,options)=>{
  assert.equal(options.redirect,'manual');
  return new Response(null,{status:302,headers:{Location:'https://attacker.example/auth/me'}});
 });
 assert.equal(user,null);
});
test('Managed Payments taxes preserve base-price quota validation',async()=>{
 const {sql,env}=fixture();env.STRIPE_MANAGED_PAYMENTS='true';
 sql.exec("INSERT INTO vts_stripe_checkouts VALUES ('cs_fixture','u1','price_credits','payment','attempt')");
 await mockStripe({...paidSession,amount_subtotal:500,amount_total:550},()=>handleWebhook(env,...signedEvent('evt_taxed','checkout.session.completed',{id:'cs_fixture'})));
 assert.equal(sql.prepare('SELECT amount FROM credit_transactions').get().amount,120);
});
test('production rejects signed test events without accessing the database',async()=>{
 const {env}=fixture();env.STRIPE_REQUIRE_LIVE='true';
 await assert.rejects(handleWebhook(env,...signedEvent('evt_testblocked','checkout.session.completed',{id:'cs_fixture'})),/Test events/);
});
test('production portable billing engine matches the tested frontend engine',()=>{
 assert.equal(readFileSync(`${process.env.VTS_BACKEND_DIR ?? '../videotosrt-backend'}/src/lib/stripe-billing.ts`,'utf8'),readFileSync('lib/stripe.ts','utf8'));
});
test('legacy subscriptions cannot be duplicated through email case variants',async()=>{
 const {sql,env}=fixture();
 sql.exec("INSERT INTO users (id,email,provider,provider_id,plan,created_at,updated_at) VALUES ('legacy','U@EXAMPLE.COM','email','legacy','pro','now','now')");
 const original=globalThis.fetch;globalThis.fetch=async()=>{throw Error('Duplicate subscription must never reach Stripe');};
 try{await assert.rejects(createCheckout(env,{id:'u1',email:'u@example.com'},{plan:'pro'}),/already have a paid/);}
 finally{globalThis.fetch=original;}
});
