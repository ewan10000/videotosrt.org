import { Hono } from 'hono';
import { BillingError, createCheckout, createPortal, handleWebhook } from '../lib/stripe-billing';
import { requireUser } from '../lib/session';
import type { HonoAppEnv } from '../types';
export const stripeRoutes = new Hono<HonoAppEnv>();
for (const [path,kind] of [['/checkout/stripe','subscription'],['/checkout/stripe/credits','credits'],['/billing/portal','portal'],['/webhooks/stripe','webhook']] as const) {
 stripeRoutes.post(path,async c=>{
  c.header('Cache-Control','no-store');
  try {
   if(kind==='webhook') {
    if(Number(c.req.header('Content-Length')??0)>1048576) return c.json({message:'Payload too large'},413);
    const raw=await c.req.text();if(raw.length>1048576)return c.json({message:'Payload too large'},413);
    return c.json(await handleWebhook(c.env,raw,c.req.header('stripe-signature')??null));
   }
   if(c.req.header('Origin')!==c.env.APP_ORIGIN || c.req.header('Sec-Fetch-Site')==='cross-site')return c.json({message:'Invalid billing origin'},403);
   const user=requireUser(c);if(!user)return c.json({message:'Verified sign-in required'},401);
   if(kind==='portal')return c.json(await createPortal(c.env,{...user,plan:user.plan??undefined}));
   const input=await c.req.json().catch(()=>null);
   if(!input || typeof input!=='object' || Array.isArray(input) || (kind==='credits'? !input.credits || input.plan : !input.plan || input.credits))return c.json({message:'Invalid selection'},400);
   return c.json(await createCheckout(c.env,{...user,plan:user.plan??undefined},input));
  }catch(error){return new Response(JSON.stringify({message:error instanceof BillingError?error.message:'Billing temporarily unavailable'}),{status:error instanceof BillingError?error.status:503,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});}
 });
}
