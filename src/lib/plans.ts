export type PlanId = "free" | "pro" | "studio";

export type PlanQuota = {
  monthlyMinutes: number;
  maxFileMinutes: number;
};

export const PLAN_QUOTAS: Record<PlanId, PlanQuota> = {
  free: { monthlyMinutes: 60, maxFileMinutes: 60 },
  pro: { monthlyMinutes: 600, maxFileMinutes: 180 },
  studio: { monthlyMinutes: 3000, maxFileMinutes: 360 },
};

const PLAN_ALIASES: Record<string, PlanId> = {
  basic: "free",
  free: "free",
  pro: "pro",
  business: "studio",
  studio: "studio",
  team: "studio",
};

export function normalizePlan(value: unknown): PlanId {
  return typeof value === "string" ? PLAN_ALIASES[value.trim().toLowerCase()] ?? "free" : "free";
}

export function getPlanQuota(plan: unknown) {
  return PLAN_QUOTAS[normalizePlan(plan)];
}

export function getMaxFileDurationSeconds(plan: unknown) {
  return getPlanQuota(plan).maxFileMinutes * 60;
}

export function isWithinFileDurationLimit(durationSeconds: number, plan: unknown) {
  return durationSeconds <= getMaxFileDurationSeconds(plan);
}
