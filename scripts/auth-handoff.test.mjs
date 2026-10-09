import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
// Compile the actual route with tiny transport helpers; its security decisions
// and upstream identity verification run unchanged.
const source = readFileSync('app/api/auth/session/complete/route.ts','utf8')
 .replace('from "@/lib/local-auth"', `from "${new URL('../lib/local-auth.ts',import.meta.url).href}"`)
 .replace('import { jsonResponse, readJson } from "@/lib/paypal";', 'const jsonResponse = (data,init) => Response.json(data,init); const readJson = request => request.json().catch(() => null);');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {POST}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
function request(headers={},body={token:'fixture-session'}) {
 return new Request('https://videotosrt.org/api/auth/session/complete',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
}
test('session completion rejects foreign/missing origins and token URLs without a matching browser session',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async()=>{throw Error('Unbound session must never reach the identity service');};
 try {
  for(const headers of [{},{Origin:'https://attacker.example'},{Origin:'https://videotosrt.org','Sec-Fetch-Site':'cross-site'},{Origin:'https://videotosrt.org'},{Origin:'https://videotosrt.org',Cookie:'vts_session=another-browser'}]) {
   assert.equal((await POST(request(headers))).status,403);
  }
  assert.equal((await POST(request({Origin:'https://videotosrt.org'},{token:123}))).status,400);
 }finally{globalThis.fetch=original;}
});
test('a matching browser session still requires upstream identity and installs HttpOnly Lax cookies',async()=>{
 const original=globalThis.fetch;
 try {
  globalThis.fetch=async(url,options)=>{
   assert.equal(options.headers.Authorization,'Bearer fixture-session');assert.equal(options.redirect,'manual');
   return Response.json({user:{id:'verified-user',email:'test@example.test',name:'Verified User'}});
  };
  const response=await POST(request({Origin:'https://videotosrt.org',Cookie:'vts_session=fixture-session'}));
  assert.equal(response.status,200);assert.equal((await response.json()).user.id,'verified-user');
  const cookies=response.headers.getSetCookie();const session=cookies.find(cookie=>cookie.startsWith('vts_session='));
  assert.match(session,/HttpOnly/);assert.match(session,/SameSite=Lax/);assert.match(session,/Secure/);
  globalThis.fetch=async()=>new Response(null,{status:401});
  assert.equal((await POST(request({Origin:'https://videotosrt.org',Cookie:'vts_session=fixture-session'}))).status,401);
 }finally{globalThis.fetch=original;}
});

test('browser-bound handoff exchanges only the cookie verifier and never installs the handoff as a session',async()=>{
 const original=globalThis.fetch;
 try {
  globalThis.fetch=async(url,options)=>{
   assert.equal(url,'https://api.videotosrt.org/api/auth/handoff/exchange');
   assert.deepEqual(JSON.parse(options.body),{token:'signed-handoff',verifier:'a'.repeat(64)});
   return Response.json({data:{token:'verified-session',user:{id:'account-a',email:'a@example.test'}}});
  };
  const response=await POST(request({Origin:'https://videotosrt.org',Cookie:'__Host-vts_oauth_verifier='+ 'a'.repeat(64)},{handoff:'signed-handoff'}));
  assert.equal(response.status,200);
  assert.match(response.headers.get('set-cookie'),/vts_session=verified-session/);
  assert.doesNotMatch(response.headers.get('set-cookie'),/vts_session=signed-handoff/);
  assert.equal((await POST(request({Origin:'https://videotosrt.org'},{handoff:'signed-handoff'}))).status,403);
 }finally{globalThis.fetch=original;}
});
test('navigation strips arbitrary URL credentials without creating a session or account',async()=>{
 const authCode=ts.transpileModule(readFileSync('lib/auth.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 const {consumeSessionTokenFromLocation}=await import('data:text/javascript;base64,'+Buffer.from(authCode).toString('base64'));
 const originalWindow=globalThis.window,originalDocument=globalThis.document;let storageWrites=0,cookieWrites=0,cleaned='';
 globalThis.window={location:{href:'https://videotosrt.org/pricing?token=attacker-session&user='+encodeURIComponent(JSON.stringify({email:'attacker@example.test',plan:'pro'}))},localStorage:{setItem(){storageWrites++;}},history:{state:null,replaceState(_state,_title,url){cleaned=url;}}};
 globalThis.document={set cookie(_value){cookieWrites++;}};
 try{assert.equal(consumeSessionTokenFromLocation(),false);assert.equal(storageWrites,0);assert.equal(cookieWrites,0);assert.equal(cleaned,'https://videotosrt.org/pricing');}
 finally{globalThis.window=originalWindow;globalThis.document=originalDocument;}
});
