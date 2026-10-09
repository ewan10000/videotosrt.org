// The verifier never leaves this host except in the server-to-server exchange.
export async function GET(request: Request) {
  if (request.headers.get('sec-fetch-site') === 'cross-site') return new Response('Invalid sign-in origin', {status:403});
  const url = new URL(request.url);
  const supplied = url.searchParams.get('returnTo');
  let returnPath = '/';
  if (supplied) {
    try {
      const target = new URL(supplied, url.origin);
      if (target.origin === url.origin && !target.pathname.startsWith('/auth/') && !target.pathname.startsWith('/api/')) returnPath = target.pathname + target.search + target.hash;
    } catch { /* Safe default. */ }
  }
  const verifier = Array.from(crypto.getRandomValues(new Uint8Array(32)), v=>v.toString(16).padStart(2,'0')).join('');
  const digest = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier));
  const challenge = Array.from(new Uint8Array(digest), v=>v.toString(16).padStart(2,'0')).join('');
  const completion = new URL('/auth/complete',url.origin);
  completion.searchParams.set('returnTo',returnPath);
  completion.searchParams.set('challenge',challenge);
  // Initiation and Google's configured callback use the same backend host.
  const login = new URL('https://api.videotosrt.org/api/auth/login');
  login.searchParams.set('provider','google');
  login.searchParams.set('returnTo',completion.toString());
  return new Response(null,{status:302,headers:{Location:login.toString(),'Set-Cookie':`__Host-vts_oauth_verifier=${verifier}; Path=/; Max-Age=600; HttpOnly; Secure; SameSite=Lax`,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
}
