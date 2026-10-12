import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { Hono } from 'hono';
import { createSignedToken, getSessionUser } from '../dist/lib/session.js';
import { consumeMinutes, addCreditsIdempotent } from '../dist/lib/credits.js';
function fixture() { const sql = new DatabaseSync(':memory:'); sql.exec(readFileSync('migrations/0001_init.sql', 'utf8')); sql.exec("INSERT INTO users(id,email,provider,provider_id,created_at,updated_at) VALUES('u','u@test','google','u','now','now')"); const db = { prepare(q) { let v = []; return { bind(...a) { v = a; return this; }, async first() { return sql.prepare(q).get(...v) ?? null; }, async run() { return this.execute(); }, execute() { return { meta: { changes: Number(sql.prepare(q).run(...v).changes) } }; } }; }, async batch(ss) { sql.exec('BEGIN'); try {
        const r = ss.map(s => s.execute());
        sql.exec('COMMIT');
        return r;
    }
    catch (e) {
        sql.exec('ROLLBACK');
        throw e;
    } } }; return { sql, db, env: { DB: db, SESSION_SECRET: 'fixture' } }; }
test('ordinary bearer and cookie reject other purposes and malformed session fields', async () => { const { env } = fixture(); const app = new Hono(); app.get('/', async (c) => c.json({ user: await getSessionUser(c) })); for (const fields of [{ purpose: 'frontend-handoff' }, { purpose: 'state' }, { purpose: null }, { provider: 'google' }, { aud: 'frontend' }, { exp: '9999999999' }, { exp: null }, { userId: [] }, { userId: ' ' }, { userId: 12 }]) {
    const token = await createSignedToken({ userId: 'u', exp: Math.floor(Date.now() / 1000) + 60, ...fields }, env.SESSION_SECRET);
    for (const headers of [{ Authorization: `Bearer ${token}` }, { Cookie: `vts_session=${token}` }])
        assert.equal((await (await app.request('/', { headers }, env)).json()).user, null);
} for (const fields of [{}, { purpose: 'session' }]) {
    const token = await createSignedToken({ userId: 'u', exp: Math.floor(Date.now() / 1000) + 60, ...fields }, env.SESSION_SECRET);
    assert.equal((await (await app.request('/', { headers: { Authorization: `Bearer ${token}` } }, env)).json()).user.id, 'u');
} });
test('debit ledger failure rolls back quota', async () => { const { env, sql } = fixture(); sql.exec("CREATE TRIGGER fail_debit BEFORE INSERT ON credit_transactions BEGIN SELECT RAISE(ABORT,'injected'); END"); await assert.rejects(consumeMinutes(env, 'u', 2, 'test')); assert.equal(sql.prepare('SELECT minutes_used FROM usage_records').get().minutes_used, 0); });
test('grant quota failure rolls back ledger and retry grants once', async () => { const { env, sql } = fixture(); sql.exec("CREATE TRIGGER fail_grant BEFORE UPDATE OF minutes_limit ON usage_records WHEN NEW.minutes_limit > OLD.minutes_limit BEGIN SELECT RAISE(ABORT,'injected'); END"); await assert.rejects(addCreditsIdempotent(env, 'u', 5, 'test', 'grant')); assert.equal(sql.prepare('SELECT count(*) n FROM credit_transactions').get().n, 0); sql.exec('DROP TRIGGER fail_grant'); await addCreditsIdempotent(env, 'u', 5, 'test', 'grant'); await addCreditsIdempotent(env, 'u', 5, 'test', 'grant'); assert.equal(sql.prepare('SELECT minutes_limit FROM usage_records').get().minutes_limit, 65); });
import { transcribeRoutes } from '../dist/routes/transcribe.js';
function transcriptionFixture() { const f = fixture(); const app = new Hono(); app.use('*', async (c, next) => { c.set('user', { id: 'u', plan: 'free' }); await next(); }); app.route('/', transcribeRoutes); Object.assign(f.env, { R2_PUBLIC_URL: 'https://storage.test', R2: { async head() { return { size: 100 }; } }, AI_QUEUE: { async send() { } } }); const request = () => app.request('/transcribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename: 'audio.mp3', audio_url: 'https://storage.test/uploads/u/audio.mp3', duration_seconds: 60, file_size_bytes: 100, idempotency_key: 'same-key-123' }) }, f.env); return { ...f, request }; }
test('concurrent same-key requests charge and enqueue once and never fail the winner', async () => { const { env, sql, request } = transcriptionFixture(); const originalPrepare = env.DB.prepare; let reads = 0, release; const barrier = new Promise(r => release = r); env.DB.prepare = q => { const st = originalPrepare(q); if (q.startsWith('SELECT * FROM transcription_jobs')) {
    const first = st.first;
    st.first = async () => { const snapshot = await first.call(st); if (++reads === 2)
        release(); await barrier; return snapshot; };
} return st; }; let sends = 0; env.AI_QUEUE.send = async () => { sends++; }; const replies = await Promise.all([request(), request()]); assert.deepEqual(replies.map(r => r.status), [202, 202]); assert.equal(sends, 1); assert.equal(sql.prepare('SELECT minutes_used FROM usage_records').get().minutes_used, 1); assert.equal(sql.prepare('SELECT status FROM transcription_jobs').get().status, 'queued'); assert.equal(sql.prepare('SELECT count(*) n FROM credit_transactions').get().n, 1); });
test('queue rejection compensates only a queued job and duplicate does not charge again', async () => { const { env, sql, request } = transcriptionFixture(); env.AI_QUEUE.send = async () => { throw Error('queue fixture'); }; assert.equal((await request()).status, 500); assert.equal((await request()).status, 202); assert.equal(sql.prepare('SELECT status FROM transcription_jobs').get().status, 'failed'); assert.equal(sql.prepare('SELECT minutes_used FROM usage_records').get().minutes_used, 0); });
test('queue ambiguous rejection cannot fail or refund a job already processing', async () => { const { env, sql, request } = transcriptionFixture(); env.AI_QUEUE.send = async () => { sql.exec("UPDATE transcription_jobs SET status='processing'"); throw Error('ack lost'); }; await request(); assert.equal(sql.prepare('SELECT status FROM transcription_jobs').get().status, 'processing'); assert.equal(sql.prepare('SELECT minutes_used FROM usage_records').get().minutes_used, 1); });
test('reservation and quota roll back together on ledger failure, retry owns one job', async () => { const { env, sql, request } = transcriptionFixture(); sql.exec("CREATE TRIGGER fail_debit BEFORE INSERT ON credit_transactions BEGIN SELECT RAISE(ABORT,'fixture'); END"); assert.equal((await request()).status, 500); assert.equal(sql.prepare('SELECT count(*) n FROM transcription_jobs').get().n, 0); assert.equal(sql.prepare('SELECT minutes_used FROM usage_records').get().minutes_used, 0); sql.exec('DROP TRIGGER fail_debit'); assert.equal((await request()).status, 202); });
test('quota exhausted does not reserve a job or create a debit', async () => { const { env, sql, request } = transcriptionFixture(); await consumeMinutes(env, 'u', 60, 'quota'); assert.equal((await request()).status, 402); assert.equal(sql.prepare('SELECT count(*) n FROM transcription_jobs').get().n, 0); assert.equal(sql.prepare('SELECT count(*) n FROM credit_transactions').get().n, 1); });
test('simultaneous debits cannot overspend and idempotent grants apply once', async () => { const { env, sql } = fixture(); assert.deepEqual((await Promise.all([consumeMinutes(env, 'u', 40, 'first'), consumeMinutes(env, 'u', 40, 'second')])).sort(), [false, true]); await Promise.all([addCreditsIdempotent(env, 'u', 5, 'grant', 'same-grant'), addCreditsIdempotent(env, 'u', 5, 'grant', 'same-grant')]); assert.equal(sql.prepare('SELECT minutes_used,minutes_limit FROM usage_records').get().minutes_used, 40); assert.equal(sql.prepare('SELECT minutes_limit FROM usage_records').get().minutes_limit, 65); assert.equal(sql.prepare('SELECT count(*) n FROM credit_transactions').get().n, 2); });

import { handleTranscription, finalizeFailedTranscription } from '../dist/worker.js';
function workerFixture() {
 const f=fixture();f.sql.exec(readFileSync('migrations/0007_transcription_execution.sql','utf8'));
 f.sql.exec("INSERT INTO usage_records VALUES('old','u','2025-01',2,60,'now','now'); INSERT INTO usage_records VALUES('new','u','2025-02',7,60,'now','now'); INSERT INTO transcription_jobs(id,user_id,status,filename,audio_url,duration_seconds,created_at,updated_at,execution_token) VALUES('job','u','processing','audio.mp3','https://audio.test',120,'2025-01-31T23:59:00Z','now','owner')");
 return {...f,message:{jobId:'job',userId:'u',filename:'audio.mp3',audioUrl:'https://audio.test',durationSeconds:999,createdAt:'2025-02-01',fileSizeBytes:10}};
}
test('completion between observation and failure transaction never refunds completed work',async()=>{
 const {env,sql,message}=workerFixture();const batch=env.DB.batch;
 env.DB.batch=async ss=>{sql.exec("UPDATE transcription_jobs SET status='completed',srt_content='winner'");return batch(ss);};
 await finalizeFailedTranscription(env,message,'failure','owner');
 assert.equal(sql.prepare('SELECT status FROM transcription_jobs').get().status,'completed');
 assert.equal(sql.prepare('SELECT count(*) n FROM credit_transactions').get().n,0);
 assert.equal(sql.prepare("SELECT minutes_used FROM usage_records WHERE month='2025-01'").get().minutes_used,2);
});
test('failure refund is atomic, original-month only, and retryable on database failure',async()=>{
 const {env,sql,message}=workerFixture();sql.exec("CREATE TRIGGER fail_refund BEFORE INSERT ON credit_transactions BEGIN SELECT RAISE(ABORT,'fixture'); END");
 await assert.rejects(finalizeFailedTranscription(env,message,'failure','owner'));
 assert.equal(sql.prepare('SELECT status FROM transcription_jobs').get().status,'processing');sql.exec('DROP TRIGGER fail_refund');
 await finalizeFailedTranscription(env,message,'failure','owner');await finalizeFailedTranscription(env,message,'failure','owner');
 assert.deepEqual(sql.prepare('SELECT month,minutes_used FROM usage_records ORDER BY month').all().map(r=>[r.month,r.minutes_used]),[['2025-01',0],['2025-02',7]]);
 assert.equal(sql.prepare('SELECT amount FROM credit_transactions').get().amount,2);
});
for(const winnerFails of [true,false]) test(`overlapping consumers fence stale ${winnerFails?'success':'failure'} after ${winnerFails?'refunded failure':'completion'}`,async()=>{
 const {env,sql,message}=workerFixture(),previous=globalThis.fetch;let calls=0,ready,finishOld;
 const started=new Promise(r=>ready=r);
 const success=()=>Response.json({segments:[{start:0,end:1,text:'winner'}]});
 const failure=()=>Response.json({error:{message:'invalid audio'}},{status:400});
 globalThis.fetch=async url=>{
  if(url==='https://audio.test')return new Response('audio');
  if(++calls===1){ready();return new Promise(r=>finishOld=()=>r(winnerFails?success():failure()));}
  return winnerFails?failure():success();
 };
 try{
  const old=handleTranscription(message,env,true);await started;
  await handleTranscription(message,env,true);finishOld();await old;
  assert.equal(sql.prepare('SELECT status FROM transcription_jobs').get().status,winnerFails?'failed':'completed');
  assert.equal(sql.prepare("SELECT minutes_used FROM usage_records WHERE month='2025-01'").get().minutes_used,winnerFails?0:2);
  assert.equal(sql.prepare('SELECT count(*) n FROM credit_transactions').get().n,winnerFails?1:0);
 }finally{globalThis.fetch=previous;}
});
test('processing redelivery can take ownership and exhausted delivery cannot overwrite a terminal result',async()=>{
 const {env,sql,message}=workerFixture();await handleTranscription(message,env,false);
 assert.equal(sql.prepare('SELECT status FROM transcription_jobs').get().status,'failed');
 await handleTranscription(message,env,false);assert.equal(sql.prepare('SELECT count(*) n FROM credit_transactions').get().n,1);
});
test('transient processing failure remains charged and redelivery completes with a new owner',async()=>{
 const {env,sql,message}=workerFixture(),previous=globalThis.fetch;let fail=true;
 globalThis.fetch=async url=>url==='https://audio.test'?new Response('audio'):fail?Response.json({error:{message:'temporary'}},{status:500}):Response.json({segments:[{start:0,end:1,text:'retry succeeded'}]});
 try{
  await assert.rejects(handleTranscription(message,env,true));
  const firstToken=sql.prepare('SELECT execution_token FROM transcription_jobs').get().execution_token;
  assert.equal(sql.prepare('SELECT status FROM transcription_jobs').get().status,'processing');
  assert.equal(sql.prepare('SELECT count(*) n FROM credit_transactions').get().n,0);
  fail=false;await handleTranscription(message,env,true);
  const job=sql.prepare('SELECT status,execution_token FROM transcription_jobs').get();
  assert.equal(job.status,'completed');assert.notEqual(job.execution_token,firstToken);
  assert.equal(sql.prepare("SELECT minutes_used FROM usage_records WHERE month='2025-01'").get().minutes_used,2);
 }finally{globalThis.fetch=previous;}
});
