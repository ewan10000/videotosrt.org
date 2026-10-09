import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import { Hono } from 'hono';
import { authRoutes } from '../dist/routes/auth.js';
import { createSignedToken } from '../dist/lib/session.js';
globalThis.crypto ??= webcrypto;
const sql=new DatabaseSync(':memory:');
sql.exec(readFileSync('migrations/0001_init.sql','utf8'));
sql.exec(readFileSync('migrations/0003_oauth_handoff.sql','utf8'));
const user = { id: 'account-a', email: 'a@example.test', plan: 'free' };
sql.prepare("INSERT INTO users (id,email,provider,provider_id,plan,created_at,updated_at) VALUES (?,?,'google','a','free','now','now')").run(user.id,user.email);
const env = { SESSION_SECRET: 'test-only', APP_ORIGIN: 'https://videotosrt.org', DB: { prepare(query) { let args=[]; return { bind(...v) {args=v;return this;}, async first() { return sql.prepare(query).get(...args)??null; }, async run() { const result=sql.prepare(query).run(...args); return {meta:{changes:result.changes}}; } }; } } };
const app=new Hono();app.route('/api',authRoutes);
const verifier='a'.repeat(64);
const challenge=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))).toString('hex');
async function mint(extra={}) {return createSignedToken({iss:'videotosrt-backend',aud:'https://videotosrt.org',purpose:'frontend-handoff',userId:user.id,challenge,nonce:crypto.randomUUID(),exp:Math.floor(Date.now()/1000)+60,...extra},env.SESSION_SECRET);}
async function exchange(token, proof=verifier, existing) {return app.request('https://api.videotosrt.org/api/auth/handoff/exchange',{method:'POST',headers:{'Content-Type':'application/json',...(existing?{Authorization:`Bearer ${existing}`}:{})},body:JSON.stringify({token,verifier:proof})},env);}
const token=await mint();assert.equal((await exchange(token,'b'.repeat(64))).status,401);
const results=await Promise.all([exchange(token),exchange(token)]);assert.deepEqual(results.map(r=>r.status).sort(),[200,401]);
for(const extra of [{exp:0},{aud:'https://evil.example'},{purpose:'session'},{userId:'account-b'}]) assert.equal((await exchange(await mint(extra))).status,401);
assert.equal((await exchange(token+'.junk')).status,401);
assert.equal((await exchange(await mint(),verifier,await createSignedToken({userId:'account-b',exp:Math.floor(Date.now()/1000)+60},env.SESSION_SECRET))).status,409);
console.log('OAuth handoff: browser binding, atomic replay, expiry, audience, signature, account isolation PASS');
