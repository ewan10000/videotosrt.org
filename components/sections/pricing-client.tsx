"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { LoginModal } from "@/components/modals/login-modal";
import { Button } from "@/components/ui/button";
import { api, authLoginUrl, type ApiUser } from "@/lib/api";
import { getLocalUser, normalizeUser, onAuthChange, setLocalUser } from "@/lib/auth";
import { trackConversionEvent } from "@/lib/conversion-events";
import { getUserVipPlan, getVipBadgeClass, getVipLabel, mergeStoredMembership } from "@/lib/plans";

const plans = [
  {
    name: "Free",
    plan: "free" as const,
    meta: "For trying the editor and light transcription.",
    monthly: "Free",
    yearly: "Free",
    suffix: "",
    features: ["60 minutes per month", "60 minutes per file", "SRT, VTT, and TXT export", "Inline subtitle editor"]
  },
  {
    name: "Pro",
    plan: "pro" as const,
    meta: "For creators who need more transcription time.",
    monthly: "$9.90",
    yearly: "$99",
    monthlySuffix: "/mo",
    yearlySuffix: "/yr",
    featured: true,
    features: ["600 minutes per month", "180 minutes per file", "SRT, VTT, and TXT export", "Inline subtitle editor"]
  },
  {
    name: "Studio",
    plan: "studio" as const,
    meta: "For higher-volume subtitle cleanup.",
    monthly: "$29.90",
    yearly: "$299",
    monthlySuffix: "/mo",
    yearlySuffix: "/yr",
    features: ["3000 minutes per month", "360 minutes per file", "SRT, VTT, and TXT export", "Inline subtitle editor"]
  }
];

const creditPackages = [
  { credits: "2h" as const, label: "$5 2 hours" },
  { credits: "5h" as const, label: "$12 5 hours" },
  { credits: "20h" as const, label: "$39 20 hours" }
];

const PENDING_PAYPAL_SUBSCRIPTION_KEY = "videotosrt.paypal.pending_subscription";
const PENDING_CHECKOUT_INTENT_KEY = "videotosrt.checkout.intent";

type PendingPaypalSubscription = {
  billing: "monthly" | "yearly";
  createdAt: number;
  plan: "pro" | "studio";
  subscriptionId?: string;
};

type PendingCheckoutIntent =
  | { billing: "monthly" | "yearly"; createdAt: number; kind: "plan"; plan: "pro" | "studio" }
  | { createdAt: number; credits: "2h" | "5h" | "20h"; kind: "credits" };

function isPlan(value: unknown): value is "pro" | "studio" {
  return value === "pro" || value === "studio";
}

function isBilling(value: unknown): value is "monthly" | "yearly" {
  return value === "monthly" || value === "yearly";
}

function isCredits(value: unknown): value is "2h" | "5h" | "20h" {
  return value === "2h" || value === "5h" || value === "20h";
}

function isFreshTimestamp(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && Date.now() - value <= 30 * 60 * 1000;
}

function isPendingCheckoutIntent(value: unknown): value is PendingCheckoutIntent {
  if (!value || typeof value !== "object") {
    return false;
  }

  const intent = value as Record<string, unknown>;
  if (!isFreshTimestamp(intent.createdAt)) {
    return false;
  }

  if (intent.kind === "plan") {
    return isPlan(intent.plan) && isBilling(intent.billing);
  }

  if (intent.kind === "credits") {
    return isCredits(intent.credits);
  }

  return false;
}

function getValidApprovalUrl(data: { approvalUrl?: string; checkout_url?: string; sessionUrl?: string; url?: string }) {
  const value = data.approvalUrl ?? data.url ?? data.checkout_url ?? data.sessionUrl;
  if (!value) {
    return "";
  }

  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (url.protocol === "https:" && (host === "www.paypal.com" || host === "www.sandbox.paypal.com")) {
      return url.toString();
    }
  } catch {
    return "";
  }

  return "";
}

function readPendingPaypalSubscription() {
  try {
    const value = window.localStorage.getItem(PENDING_PAYPAL_SUBSCRIPTION_KEY);
    return value ? JSON.parse(value) as PendingPaypalSubscription : null;
  } catch {
    window.localStorage.removeItem(PENDING_PAYPAL_SUBSCRIPTION_KEY);
    return null;
  }
}

function readPendingCheckoutIntent() {
  try {
    const value = window.localStorage.getItem(PENDING_CHECKOUT_INTENT_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value) as unknown;
    if (!isPendingCheckoutIntent(parsed)) {
      window.localStorage.removeItem(PENDING_CHECKOUT_INTENT_KEY);
      return null;
    }
    return parsed;
  } catch {
    window.localStorage.removeItem(PENDING_CHECKOUT_INTENT_KEY);
    return null;
  }
}

export function PricingClient() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [loadingPlan, setLoadingPlan] = useState<"pro" | "studio" | null>(null);
  const [loadingCredits, setLoadingCredits] = useState<"2h" | "5h" | "20h" | null>(null);
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<"pro" | "studio" | null>(null);
  const [pendingCredits, setPendingCredits] = useState<"2h" | "5h" | "20h" | null>(null);
  const [checkoutError, setCheckoutError] = useState("");
  const [checkoutNotice, setCheckoutNotice] = useState("");
  const resumedCheckoutIntentRef = useRef(false);
  const vipPlan = getUserVipPlan(user);

  useEffect(() => {
    let mounted = true;
    const removeAuthListener = onAuthChange((nextUser) => setUser(nextUser));

    function refreshUser() {
      return api
      .me()
      .then((data) => {
        if (mounted) {
          const nextUser = mergeStoredMembership(normalizeUser(data), getLocalUser());
          setLocalUser(nextUser);
          setUser(nextUser);
          const intent = nextUser ? readPendingCheckoutIntent() : null;
          if (intent?.kind === "plan" && !resumedCheckoutIntentRef.current) {
            resumedCheckoutIntentRef.current = true;
            setCheckoutNotice(`Signed in. Resuming ${intent.plan} ${intent.billing} checkout...`);
            void runCheckout(intent.plan, intent.billing);
          }
          if (intent?.kind === "credits" && !resumedCheckoutIntentRef.current) {
            resumedCheckoutIntentRef.current = true;
            setCheckoutNotice(`Signed in. Resuming ${intent.credits} extra-hours checkout...`);
            void runCreditsCheckout(intent.credits);
          }
        }
      })
      .catch(() => {
        if (mounted) {
          setLocalUser(null);
          setUser(null);
        }
      });
    }

    void refreshUser();

    const params = new URLSearchParams(window.location.search);
    const checkoutState = params.get("checkout");
    if (checkoutState === "success") {
      setCheckoutNotice("Payment completed. Verifying your VIP permissions...");
      const pendingSubscription = readPendingPaypalSubscription();
      const subscriptionId =
        params.get("subscription_id") ??
        params.get("subscriptionID") ??
        pendingSubscription?.subscriptionId;
      const rawPlan = params.get("plan");
      const rawBilling = params.get("billing");
      const plan = rawPlan === "pro" || rawPlan === "studio" ? rawPlan : pendingSubscription?.plan;
      const returnedBilling = rawBilling === "yearly" || rawBilling === "monthly" ? rawBilling : pendingSubscription?.billing;
      if (subscriptionId) {
        void api
          .syncPaypalSubscription({ billing: returnedBilling, plan, subscriptionId })
          .then((data) => {
            window.localStorage.removeItem(PENDING_PAYPAL_SUBSCRIPTION_KEY);
            trackConversionEvent("checkout_completed", { billing: returnedBilling, plan, source: "paypal_subscription" });
            if (data.user) {
              setLocalUser(data.user);
              setUser(data.user);
            }
            setCheckoutNotice("Payment verified. VIP permissions are active now.");
          })
          .catch((error) => {
            void refreshUser();
            trackConversionEvent("checkout_failed", { billing: returnedBilling, plan, source: "paypal_subscription_sync" });
            setCheckoutNotice(error instanceof Error ? error.message : "Payment completed, but VIP verification failed. Please refresh in a moment.");
          });
      } else {
        setCheckoutNotice("Payment returned without a subscription ID. We are refreshing your account, but VIP permissions are not active until PayPal verification completes.");
      }

      const timers = [2500, 7000].map((delay) => window.setTimeout(() => {
        void refreshUser();
      }, delay));

      return () => {
        mounted = false;
        removeAuthListener();
        timers.forEach((timer) => window.clearTimeout(timer));
      };
    }

    if (checkoutState === "cancelled") {
      setCheckoutNotice("Checkout was cancelled. No changes were made to your membership.");
    }

    if (checkoutState === "credits-success") {
      const orderId = params.get("token");
      const credits = params.get("credits");
      if (orderId) {
        const captureKey = `videotosrt.paypal.capture.${orderId}`;
        window.localStorage.setItem(captureKey, "pending");
        setCheckoutNotice("Payment completed. Syncing extra hours...");
        void api
          .captureCredits(orderId)
          .then((data) => {
            window.localStorage.setItem(captureKey, "done");
            trackConversionEvent("checkout_completed", { credits: credits ?? "unknown", source: "paypal_credits" });
            const currentUser = getLocalUser();
            const nextUser = data.user ?? (currentUser
              ? { ...currentUser, extra_credit_hours: (currentUser.extra_credit_hours ?? 0) + (data.hours ?? 0) }
              : currentUser);
            setLocalUser(nextUser);
            setUser(nextUser);
            setCheckoutNotice(data.applied === false
              ? "Extra hours are already synced to your account."
              : `${data.hours ?? credits ?? "Extra"} hours added to your account.`);
          })
          .catch((error) => {
            window.localStorage.removeItem(captureKey);
            trackConversionEvent("checkout_failed", { credits: credits ?? "unknown", source: "paypal_credits_capture" });
            setCheckoutNotice(error instanceof Error ? error.message : "Payment completed, but credits sync failed. Please try refreshing.");
          });
      }
    }

    if (checkoutState === "credits-cancelled") {
      setCheckoutNotice("Extra hours checkout was cancelled. No changes were made.");
    }

    return () => {
      mounted = false;
      removeAuthListener();
    };
  }, []);

  async function runCheckout(plan: "pro" | "studio", selectedBilling: "monthly" | "yearly") {
    if (loadingPlan || loadingCredits) {
      return;
    }
    setLoadingPlan(plan);
    setCheckoutError("");
    trackConversionEvent("checkout_started", { billing: selectedBilling, plan, source: "pricing" });
    try {
      const data = await api.checkout(plan, selectedBilling);
      const url = getValidApprovalUrl(data);

      if (!url) {
        throw new Error("Checkout is not available right now. Please try again later.");
      }

      window.localStorage.setItem(PENDING_PAYPAL_SUBSCRIPTION_KEY, JSON.stringify({
        createdAt: Date.now(),
        billing: selectedBilling,
        plan,
        subscriptionId: data.id
      } satisfies PendingPaypalSubscription));
      window.localStorage.removeItem(PENDING_CHECKOUT_INTENT_KEY);
      window.location.href = url;
    } catch (error) {
      trackConversionEvent("checkout_failed", { billing: selectedBilling, plan, source: "pricing_start" });
      setCheckoutError(error instanceof Error ? error.message : "Could not start checkout. Please try again.");
    } finally {
      setLoadingPlan(null);
    }
  }

  async function runCreditsCheckout(credits: "2h" | "5h" | "20h") {
    if (loadingCredits || loadingPlan) {
      return;
    }
    setLoadingCredits(credits);
    setCheckoutError("");
    trackConversionEvent("checkout_started", { credits, source: "pricing_credits" });
    try {
      const data = await api.checkoutCredits(credits);
      const url = getValidApprovalUrl(data);

      if (!url) {
        throw new Error("Credits checkout is not available right now. Please try again later.");
      }

      window.localStorage.removeItem(PENDING_CHECKOUT_INTENT_KEY);
      window.location.href = url;
    } catch (error) {
      trackConversionEvent("checkout_failed", { credits, source: "pricing_credits_start" });
      setCheckoutError(error instanceof Error ? error.message : "Could not start credits checkout. Please try again.");
    } finally {
      setLoadingCredits(null);
    }
  }

  function startCheckout(plan: "pro" | "studio", selectedBilling = billing) {
    if (loadingPlan || loadingCredits) {
      return;
    }
    trackConversionEvent("checkout_intent", { billing: selectedBilling, plan, source: "pricing" });
    if (!user) {
      setPendingPlan(plan);
      setPendingCredits(null);
      window.localStorage.setItem(PENDING_CHECKOUT_INTENT_KEY, JSON.stringify({
        billing: selectedBilling,
        createdAt: Date.now(),
        kind: "plan",
        plan
      } satisfies PendingCheckoutIntent));
      setCheckoutNotice(`Redirecting to Google sign-in. ${plan === "pro" ? "Pro" : "Studio"} ${selectedBilling} checkout will resume automatically.`);
      trackConversionEvent("sign_in_started", { source: "pricing_checkout" });
      window.location.href = authLoginUrl("google", "/pricing");
      return;
    }

    runCheckout(plan, selectedBilling);
  }

  function startCreditsCheckout(credits: "2h" | "5h" | "20h") {
    if (loadingPlan || loadingCredits) {
      return;
    }
    trackConversionEvent("checkout_intent", { credits, source: "pricing_credits" });
    if (!user) {
      setPendingCredits(credits);
      setPendingPlan(null);
      window.localStorage.setItem(PENDING_CHECKOUT_INTENT_KEY, JSON.stringify({
        createdAt: Date.now(),
        credits,
        kind: "credits"
      } satisfies PendingCheckoutIntent));
      setCheckoutNotice(`Redirecting to Google sign-in. ${credits} extra-hours checkout will resume automatically.`);
      trackConversionEvent("sign_in_started", { source: "pricing_credits" });
      window.location.href = authLoginUrl("google", "/pricing");
      return;
    }

    runCreditsCheckout(credits);
  }

  return (
    <>
      <LoginModal
        open={loginOpen}
        onOpenChange={setLoginOpen}
        title={pendingCredits ? "Continue to extra hours" : "Continue to checkout"}
        description="Sign in with Google so checkout can attach the purchase to your VideoToSRT account."
      />
      <header className="border-b border-soft/15 py-[72px]">
        <div className="site-container grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <span className="eyebrow"><span className="dot" /> Simple subtitle pricing</span>
            <h1 className="mb-4 mt-5 max-w-[760px] text-[clamp(42px,6vw,68px)] font-extrabold leading-[1]">Simple Pricing. No Surprises.</h1>
            <p className="mb-0 max-w-[720px] text-lg leading-[1.7] text-muted">
              Start free. Upgrade when you need more transcription minutes. A 25 MB technical upload guard applies while transcription runs through the current browser and Worker pipeline.
            </p>
          </div>
          <div className="rounded border border-line bg-panel p-2">
            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                className={`min-h-11 rounded px-5 text-sm font-extrabold ${billing === "monthly" ? "bg-indigo text-white" : "text-soft"}`}
                onClick={() => setBilling("monthly")}
              >
                Monthly
              </button>
              <button
                type="button"
                className={`min-h-11 rounded px-5 text-sm font-extrabold ${billing === "yearly" ? "bg-indigo text-white" : "text-soft"}`}
                onClick={() => setBilling("yearly")}
              >
                Annual
              </button>
            </div>
            <p className="mb-0 mt-2 text-center text-xs font-semibold text-cyan">
              Secure billing with PayPal · Annual saves 2 months
            </p>
          </div>
        </div>
      </header>
      <section id="pricing" className="section-pad">
        <div className="site-container">
          <div className="section-head">
            <h2>Choose a plan.</h2>
            <p>Plans differ by transcription minutes. Every plan includes the inline editor and SRT, VTT, and TXT export.</p>
          </div>
          {checkoutError ? (
            <p className="mb-4 flex items-center justify-end gap-3 text-sm font-semibold text-red-300" aria-live="polite">
              <span>{checkoutError}</span>
              <button className="text-xs font-extrabold text-red-200 underline underline-offset-2" type="button" onClick={() => setCheckoutError("")}>
                Close
              </button>
            </p>
          ) : null}
          {user ? (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded border border-line bg-panel px-4 py-3 text-sm font-semibold">
              <span className="text-soft">Signed in membership</span>
              <span className={`rounded border px-2.5 py-1 text-xs font-extrabold uppercase tracking-normal ${getVipBadgeClass(vipPlan)}`}>
                {getVipLabel(vipPlan)}
              </span>
              {user.extra_credit_hours ? (
                <span className="rounded border border-cyan/30 bg-cyan/10 px-2.5 py-1 text-xs font-extrabold text-cyan">
                  {user.extra_credit_hours} extra hours
                </span>
              ) : null}
            </div>
          ) : null}
          {checkoutNotice ? (
            <p className="mb-4 rounded border border-cyan/30 bg-cyan/10 px-4 py-3 text-sm font-semibold text-cyan" aria-live="polite">
              {checkoutNotice}
            </p>
          ) : null}
          <div className="grid gap-4 lg:grid-cols-3">
            {plans.map((plan) => (
              <article key={plan.name} className={`panel-card p-[22px] ${plan.featured ? "border-cyan bg-cyan/[.045] shadow-panel" : ""}`}>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="mb-0 text-xl font-extrabold">{plan.name}</h3>
                  {plan.featured ? <span className="rounded bg-cyan/10 px-3 py-1 text-xs font-extrabold text-cyan">Popular</span> : null}
                </div>
                <p className="mb-5 min-h-12 text-sm leading-6 text-muted">{plan.meta}</p>
                <div className="mb-5 text-5xl font-extrabold">
                  {billing === "yearly" ? plan.yearly : plan.monthly}
                  {plan.plan !== "free" ? (
                    <span className="text-base text-soft">{billing === "yearly" ? plan.yearlySuffix : plan.monthlySuffix}</span>
                  ) : null}
                </div>
                <ul className="mb-6 grid gap-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2 text-sm text-muted"><Check className="h-4 w-4 shrink-0 text-success" />{feature}</li>
                  ))}
                </ul>
                {plan.plan === "free" ? (
                  <Link className="inline-flex min-h-[42px] w-full items-center justify-center rounded border border-line bg-white/[.03] px-4 text-sm font-bold" href="/#upload">
                    Start free upload - 25 MB AI guard
                  </Link>
                ) : (
                  <Button
                    variant={plan.featured ? "primary" : "secondary"}
                    className="w-full"
                    type="button"
                    disabled={loadingPlan !== null}
                    onClick={() => startCheckout(plan.plan)}
                  >
                    {loadingPlan === plan.plan
                      ? "Opening checkout..."
                      : `Start ${plan.name}`}
                  </Button>
                )}
              </article>
            ))}
          </div>
          <div className="mt-5 rounded border border-line bg-panel p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="mb-1 text-xl font-extrabold">Pay as you go</h3>
                <p className="mb-0 text-muted">Buy extra transcription hours that never expire.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {creditPackages.map((item) => (
                  <Button
                    key={item.credits}
                    variant={item.credits === "2h" ? "primary" : "secondary"}
                    className={item.credits === "2h"
                      ? "min-w-[128px] shadow-[0_12px_30px_rgba(99,102,241,.22)]"
                      : "min-w-[128px] border-cyan/50 bg-cyan/10 text-cyan shadow-[0_10px_24px_rgba(34,211,238,.12)]"}
                    type="button"
                    disabled={loadingCredits !== null}
                    onClick={() => startCreditsCheckout(item.credits)}
                  >
                    {loadingCredits === item.credits ? "Opening..." : item.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {[
              ["Technical guard", "AI transcription currently accepts local audio/video uploads up to 25 MB. Minute quotas are separate duration limits, so a long high-bitrate file may need compression before transcription."],
              ["Billing provider", "Subscriptions and extra-hour purchases open PayPal checkout after Google sign-in so the purchase can attach to your account."],
              ["Cancellation and support", "Cancel subscription billing in PayPal or contact support@videotosrt.org. Refunds are not promised here and are handled case by case through support and the payment provider process."]
            ].map(([title, body]) => (
              <article key={title} className="rounded border border-line bg-panel p-4">
                <h3 className="mb-2 text-base font-extrabold">{title}</h3>
                <p className="mb-0 text-sm leading-6 text-muted">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
