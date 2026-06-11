import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const legacyRedirects: Record<string, string> = {
    "/privacy": "/privacy-policy",
    "/terms": "/terms-of-service",
    "/faq": "/#faq"
  };

  if (request.nextUrl.hostname === "www.videotosrt.org") {
    const url = request.nextUrl.clone();
    url.hostname = "videotosrt.org";
    url.protocol = "https:";
    return NextResponse.redirect(url, 301);
  }

  const destination = legacyRedirects[request.nextUrl.pathname];
  if (destination) {
    const url = request.nextUrl.clone();
    url.pathname = destination.split("#")[0];
    url.hash = destination.includes("#") ? destination.split("#")[1] : "";
    return NextResponse.redirect(url, 301);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|favicon-16x16.png|favicon-32x32.png|apple-touch-icon.png|og-image.png).*)"]
};
