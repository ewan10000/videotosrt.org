import { authenticate } from "@/lib/stripe";
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin || request.headers.get("sec-fetch-site") === "cross-site") return Response.json({ message: "Invalid bridge origin." }, { status: 403 });
  const user = await authenticate(request);
  if (!user) return Response.json({ message: "Verified session required." }, { status: 401 });
  return Response.json({ data: { user }, user }, { headers: { "Cache-Control": "no-store" } });
}
