import { getCloudflareContext } from "@opennextjs/cloudflare";
import { isValidEmail, localAuthCookieHeader, normalizeEmail, userFromEmail } from "@/lib/local-auth";
import { jsonResponse, readJson } from "@/lib/paypal";
import { upsertUserLogin, type UserStoreEnv } from "@/lib/user-store";

type EmailPayload = {
  email?: string;
};

export async function POST(request: Request) {
  const payload = await readJson<EmailPayload>(request);
  const email = normalizeEmail(payload?.email ?? "");

  if (!isValidEmail(email)) {
    return jsonResponse({ message: "Enter a valid email address." }, { status: 400 });
  }

  const user = userFromEmail(email);
  const env = (await getCloudflareContext({ async: true })).env as UserStoreEnv;
  await upsertUserLogin(env, user);

  return jsonResponse(
    {
      expires_in_seconds: 2592000,
      sent: true,
      user
    },
    {
      headers: {
        "Set-Cookie": localAuthCookieHeader(user)
      }
    }
  );
}
