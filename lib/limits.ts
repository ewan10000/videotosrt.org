export type PlanId = "free" | "pro" | "studio";

export const PLAN_LIMITS: Record<PlanId, { maxFileMinutes: number; monthlyMinutes: number }> = {
  free: { monthlyMinutes: 60, maxFileMinutes: 60 },
  pro: { monthlyMinutes: 600, maxFileMinutes: 180 },
  studio: { monthlyMinutes: 3000, maxFileMinutes: 360 }
};

export const TECHNICAL_TRANSCRIPTION_UPLOAD_BYTES = 25 * 1024 * 1024;

export function getPlanLimits(plan: PlanId) {
  return PLAN_LIMITS[plan];
}
