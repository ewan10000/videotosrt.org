"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { LoginModal } from "@/components/modals/login-modal";
import { Button } from "@/components/ui/button";
import { api, type ApiUser } from "@/lib/api";
import { getLocalUser, normalizeUser, onAuthChange, setLocalUser } from "@/lib/auth";
import { getUserVipPlan, getVipBadgeClass, getVipLabel, mergeStoredMembership } from "@/lib/plans";

const plans = [
  {
    name: "Free",
    plan: "free" as const,
    meta: "For trying it out. One video, no commitment.",
    monthly: "Free",
    yearly: "Free",
    suffix: "",
    features: ["30 minutes per month", "SRT, VTT, and TXT export", "Inline subtitle editor", "Export with email login"]
  },
  {
    name: "Pro",
    plan: "pro" as const,
    meta: "For creators who ship weekly. Burn-in, styles, batch — everything you need to move fast.",
    monthly: "$9.90",
    yearly: "$99",
    monthlySuffix: "/mo",
    yearlySuffix: "/yr",
    featured: true,
    features: ["10 hours per month", "Burn-in export preview", "Style templates", "Batch processing"]
  },
  {
    name: "Studio",
    plan: "studio" as const,
    meta: "For teams with standards. Shared templates, API, brand control.",
    monthly: "$29.90",
    yearly: "$299",
    monthlySuffix: "/mo",
    yearlySuffix: "/yr",
    features: ["50 hours per month", "Team seats", "API access", "Brand templates"]
  }
];

const creditPackages = [
  { credits: "2h" as const, label: "$5 2 hours" },
  { credits: "5h" as const, label: "$12 5 hours" },
  { credits: "20h" as const, label: "$39 20 hours" }
];

const PENDING_PAYPAL_SUBSCRIPTION_KEY = "videotosrt.paypal.pending_subscription";

type PendingPaypalSubscription = {
  billing: "monthly" | "yearly";
  createdAt: number;
  plan: "pro" | "studio";
  subscriptionId?: string;
};

function readPendingPaypalSubscription() {
  try {
    const value = window.localStorage.getItem(PENDING_PAYPAL_SUBSCRIPTION_KEY);
    return value ? JSON.parse(value) as PendingPaypalSubscription : null;
  } catch {
    window.localStorage.removeItem(PENDING_PAYPAL_SUBSCRIPTION_KEY);
    return null;
  }
}

function activateLocalPlan(plan: "pro" | "studio", currentUser: ApiUser | null) {
  const nextUser = {
    ...(currentUser ?? {}),
    plan,
    subscription_status: "ACTIVE"
  };

  setLocalUser(nextUser);
  return nextUser;
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
      setCheckoutNotice("Payment completed. Syncing your VIP permissions...");
      const pendingSubscription = readPendingPaypalSubscription();
      const subscriptionId =
        params.get("subscription_id") ??
        params.get("subscriptionID") ??
        pendingSubscription?.subscriptionId;
      const rawPlan = params.get("plan");
      const rawBilling = params.get("billing");
      const plan = rawPlan === "pro" || rawPlan === "studio" ? rawPlan : pendingSubscription?.plan;
      const returnedBilling = rawBilling === "yearly" || rawBilling === "monthly" ? rawBilling : pendingSubscription?.billing;
      if (plan) {
        const nextUser = activateLocalPlan(plan, getLocalUser());
        setUser(nextUser);
        setCheckoutNotice("Payment completed. VIP permissions are active now.");
      }
      if (subscriptionId) {
        void api
          .syncPaypalSubscription({ billing: returnedBilling, plan, subscriptionId })
          .then((data) => {
            const syncedPlan = data.plan === "pro" || data.plan === "studio" ? data.plan : plan ?? "pro";
            const nextUser = data.user ?? activateLocalPlan(syncedPlan, getLocalUser());
            window.localStorage.removeItem(PENDING_PAYPAL_SUBSCRIPTION_KEY);
            setLocalUser(nextUser);
            setUser(nextUser);
            setCheckoutNotice("Payment completed. VIP permissions are active now.");
          })
          .catch((error) => {
            if (plan) {
              setCheckoutNotice("Payment completed. VIP is active locally while PayPal verification finishes.");
              return;
            }
            setCheckoutNotice(error instanceof Error ? error.message : "Payment completed, but VIP sync failed. Please refresh in a moment.");
          });
      }

      const timers = [2500, 7000].map((delay) => window.setTimeout(() => {
        void refreshUser().then(() => {
          if (plan) {
            const nextUser = activateLocalPlan(plan, getLocalUser());
            setUser(nextUser);
          }
        });
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
        if (!window.localStorage.getItem(captureKey)) {
          window.localStorage.setItem(captureKey, "pending");
          setCheckoutNotice("Payment completed. Adding extra hours...");
          void api
            .captureCredits(orderId)
            .then((data) => {
              window.localStorage.setItem(captureKey, "done");
              const currentUser = getLocalUser();
              const nextUser = currentUser
                ? { ...currentUser, extra_credit_hours: (currentUser.extra_credit_hours ?? 0) + (data.hours ?? 0) }
                : currentUser;
              setLocalUser(nextUser);
              setUser(nextUser);
              setCheckoutNotice(`${data.hours ?? credits ?? "Extra"} hours added to your account.`);
            })
            .catch((error) => {
              window.localStorage.removeItem(captureKey);
              setCheckoutNotice(error instanceof Error ? error.message : "Payment completed, but credits sync failed. Please try refreshing.");
            });
        } else {
          setCheckoutNotice("Extra hours payment has already been processed.");
        }
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
    setLoadingPlan(plan);
    setCheckoutError("");
    try {
      const data = await api.checkout(plan, selectedBilling);
      const url = data.approvalUrl ?? data.url ?? data.checkout_url ?? data.sessionUrl;

      if (!url) {
        throw new Error("Checkout is not available right now. Please try again later.");
      }

      window.localStorage.setItem(PENDING_PAYPAL_SUBSCRIPTION_KEY, JSON.stringify({
        createdAt: Date.now(),
        billing: selectedBilling,
        plan,
        subscriptionId: data.id
      } satisfies PendingPaypalSubscription));
      window.location.href = url;
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "Could not start checkout. Please try again.");
    } finally {
      setLoadingPlan(null);
    }
  }

  async function runCreditsCheckout(credits: "2h" | "5h" | "20h") {
    setLoadingCredits(credits);
    setCheckoutError("");
    try {
      const data = await api.checkoutCredits(credits);
      const url = data.approvalUrl ?? data.url ?? data.checkout_url ?? data.sessionUrl;

      if (!url) {
        throw new Error("Credits checkout is not available right now. Please try again later.");
      }

      window.location.href = url;
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "Could not start credits checkout. Please try again.");
    } finally {
      setLoadingCredits(null);
    }
  }

  function startCheckout(plan: "pro" | "studio", selectedBilling = billing) {
    if (!user) {
      setPendingPlan(plan);
      setLoginOpen(true);
      return;
    }

    runCheckout(plan, selectedBilling);
  }

  function startCreditsCheckout(credits: "2h" | "5h" | "20h") {
    if (!user) {
      setPendingCredits(credits);
      setLoginOpen(true);
      return;
    }

    runCreditsCheckout(credits);
  }

  function handleLoginSuccess(nextUser: ApiUser) {
    setUser(nextUser);
    const plan = pendingPlan;
    const credits = pendingCredits;
    setPendingPlan(null);
    setPendingCredits(null);
    if (plan) {
      runCheckout(plan, billing);
    }
    if (credits) {
      runCreditsCheckout(credits);
    }
  }

  return (
    <>
      <LoginModal open={loginOpen} onOpenChange={setLoginOpen} onLoginSuccess={handleLoginSuccess} />
      <header className="border-b border-soft/15 py-[72px]">
        <div className="site-container grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <span className="eyebrow"><span className="dot" /> Simple subtitle pricing</span>
            <h1 className="mb-4 mt-5 max-w-[760px] text-[clamp(42px,6vw,68px)] font-extrabold leading-[1]">Simple Pricing. No Surprises.</h1>
            <p className="mb-0 max-w-[720px] text-lg leading-[1.7] text-muted">
              Start free. Upgrade when you need more. Downgrade anytime. No tricks.
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
            <p>Every plan includes the focused VideoToSRT editor and export controls for clean caption handoff.</p>
          </div>
          {checkoutError ? (
            <p className="mb-4 flex items-center justify-end gap-3 text-sm font-semibold text-red-300">
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
            <p className="mb-4 rounded border border-cyan/30 bg-cyan/10 px-4 py-3 text-sm font-semibold text-cyan">
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
                    Start Free
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
          <p className="mb-0 mt-5 text-center text-sm font-semibold text-soft">
            <Link className="text-cyan underline underline-offset-4" href="/terms-of-service">7-day money-back guarantee. No questions asked.</Link>
          </p>
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
        </div>
      </section>
    </>
  );
}
