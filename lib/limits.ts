export type PlanId = "free" | "pro" | "studio";

export const PLAN_LIMITS: Record<PlanId, { maxFileMinutes: number; monthlyMinutes: number }> = {
  free: { monthlyMinutes: 60, maxFileMinutes: 60 },
  pro: { monthlyMinutes: 600, maxFileMinutes: 180 },
  studio: { monthlyMinutes: 3000, maxFileMinutes: 360 }
};

export const TECHNICAL_TRANSCRIPTION_UPLOAD_BYTES = 100_000_000;
export const TECHNICAL_TRANSCRIPTION_UPLOAD_LABEL = "100 MB (100,000,000 bytes)";
export const TECHNICAL_TRANSCRIPTION_UPLOAD_MESSAGE =
  `Automatic transcription currently supports files up to ${TECHNICAL_TRANSCRIPTION_UPLOAD_LABEL}; compress/extract audio or choose a smaller file.`;

export function getPlanLimits(plan: PlanId) {
  return PLAN_LIMITS[plan];
}
