export type PlanId = "free" | "pro" | "studio";

export const PLAN_LIMITS: Record<PlanId, { maxFileMinutes: number; monthlyMinutes: number }> = {
  free: { monthlyMinutes: 60, maxFileMinutes: 60 },
  pro: { monthlyMinutes: 600, maxFileMinutes: 180 },
  studio: { monthlyMinutes: 3000, maxFileMinutes: 360 }
};

export const GROQ_MULTIPART_ATTACHMENT_SIZE_LIMIT_BYTES = 25_000_000;
export const PROVIDER_COMPATIBLE_TRANSCRIPTION_UPLOAD_BYTES = 100_000_000;
export const PROVIDER_COMPATIBLE_TRANSCRIPTION_UPLOAD_LABEL = "100 MB (100,000,000 bytes)";
export const TECHNICAL_TRANSCRIPTION_UPLOAD_BYTES = 300_000_000;
export const TECHNICAL_TRANSCRIPTION_UPLOAD_LABEL = "300 MB (300,000,000 bytes)";
export const TECHNICAL_TRANSCRIPTION_UPLOAD_MESSAGE =
  `Automatic transcription supports files up to ${TECHNICAL_TRANSCRIPTION_UPLOAD_LABEL}. Files over ${PROVIDER_COMPATIBLE_TRANSCRIPTION_UPLOAD_LABEL} are converted into smaller audio chunks locally in your browser before transcription.`;

export function getPlanLimits(plan: PlanId) {
  return PLAN_LIMITS[plan];
}
