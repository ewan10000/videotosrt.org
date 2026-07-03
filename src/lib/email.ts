import type { Bindings } from "../types";

const FROM_EMAIL = "support@videotosrt.org";
const VERIFICATION_SUBJECT = "VideoToSRT Verification Code";
export const EMAIL_VERIFICATION_TTL_SECONDS = 600;

function verificationEmailHtml(code: string) {
  return `
    <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
      <p>Your VideoToSRT verification code is:</p>
      <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px; margin: 24px 0;">${code}</p>
      <p>This code expires in 10 minutes.</p>
      <p>If you did not request this code, you can ignore this email.</p>
    </div>
  `;
}

function verificationEmailText(code: string) {
  return `Your VideoToSRT verification code is ${code}. This code expires in 10 minutes.`;
}

export async function sendVerificationCodeEmail(env: Bindings, email: string, code: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: email,
      subject: VERIFICATION_SUBJECT,
      html: verificationEmailHtml(code),
      text: verificationEmailText(code),
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend email request failed with status ${response.status}`);
  }

  return response.json<{ id: string }>();
}
