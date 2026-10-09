// Billing runs on the API Worker, which holds the production Stripe bindings.
export async function billingRoute(request: Request, kind: 'subscription' | 'credits' | 'portal' | 'webhook') {
  if (kind !== 'webhook' && (request.headers.get('origin') !== new URL(request.url).origin || request.headers.get('sec-fetch-site') === 'cross-site')) return Response.json({message:'Invalid billing request origin.'},{status:403});
  const path = {subscription:'/checkout/stripe',credits:'/checkout/stripe/credits',portal:'/billing/portal',webhook:'/webhooks/stripe'}[kind];
  const headers = new Headers();
  for (const name of ['content-type','authorization','cookie','stripe-signature','origin','sec-fetch-site']) {
    const value = request.headers.get(name); if (value) headers.set(name,value);
  }
  const response = await fetch(`https://api.videotosrt.org/api${path}`,{method:'POST',headers,body:await request.arrayBuffer(),redirect:'manual',cache:'no-store'});
  return new Response(response.body,{status:response.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
}
