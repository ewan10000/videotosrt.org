import { clearLocalAuthCookieHeader } from "@/lib/local-auth";
import { jsonResponse } from "@/lib/paypal";

export async function POST() {
  return jsonResponse(
    { ok: true },
    {
      headers: {
        "Set-Cookie": clearLocalAuthCookieHeader()
      }
    }
  );
}
