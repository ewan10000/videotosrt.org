import type { ApiUser } from "@/lib/api";

export type VipPlan = "free" | "pro" | "studio";

const PLAN_ALIASES: Record<string, VipPlan> = {
  free: "free",
  basic: "free",
  monthly: "pro",
  pro: "pro",
  yearly: "studio",
  studio: "studio",
  team: "studio"
};

export function normalizeVipPlan(value?: unknown): VipPlan {
  if (typeof value !== "string") {
    return "free";
  }

  return PLAN_ALIASES[value.trim().toLowerCase()] ?? "free";
}

export function getUserVipPlan(user: ApiUser | null | undefined): VipPlan {
  if (!user) {
    return "free";
  }

  return normalizeVipPlan(
    user.plan ??
    user.vip_level ??
    user.subscription_plan ??
    user.subscription_tier ??
    user.tier
  );
}

export function getVipLabel(plan: VipPlan) {
  if (plan === "studio") {
    return "Studio VIP";
  }

  if (plan === "pro") {
    return "Pro VIP";
  }

  return "Free";
}

export function getVipBadgeClass(plan: VipPlan) {
  if (plan === "studio") {
    return "border-indigo/40 bg-indigo/15 text-text";
  }

  if (plan === "pro") {
    return "border-cyan/40 bg-cyan/10 text-cyan";
  }

  return "border-line bg-white/[.03] text-soft";
}

export function canUseStyledExport(user: ApiUser | null | undefined) {
  return getUserVipPlan(user) !== "free";
}

export function getExtraCreditLabel(user: ApiUser | null | undefined) {
  const hours = user?.extra_credit_hours;
  if (!hours || hours <= 0) {
    return "";
  }

  return `${hours}h left`;
}

function hasRemoteMembership(user: ApiUser | null | undefined) {
  return Boolean(
    user?.plan ??
    user?.vip_level ??
    user?.subscription_plan ??
    user?.subscription_tier ??
    user?.tier
  );
}

export function mergeStoredMembership(remoteUser: ApiUser | null, storedUser: ApiUser | null) {
  if (!remoteUser || !storedUser) {
    return remoteUser;
  }

  if (hasRemoteMembership(remoteUser)) {
    return remoteUser;
  }

  const storedPlan = getUserVipPlan(storedUser);
  if (storedPlan === "free" && !storedUser.extra_credit_hours) {
    return remoteUser;
  }

  return {
    ...remoteUser,
    extra_credit_hours: storedUser.extra_credit_hours,
    plan: storedUser.plan
  };
}
