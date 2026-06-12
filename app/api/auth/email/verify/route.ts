import { isValidEmail, localAuthCookieHeader, normalizeEmail, userFromEmail } from "@/lib/local-auth";
import { jsonResponse, readJson } from "@/lib/paypal";

type VerifyPayload = {
  code?: string;
  email?: string;
};

export async function POST(request: Request) {
  const payload = await readJson<VerifyPayload>(request);
  const email = normalizeEmail(payload?.email ?? "");

  if (!isValidEmail(email)) {
    return jsonResponse({ message: "Enter a valid email address." }, { status: 400 });
  }

  const user = userFromEmail(email);
  return jsonResponse(
    {
      data: { user },
      user
    },
    {
      headers: {
        "Set-Cookie": localAuthCookieHeader(user)
      }
    }
  );
}
