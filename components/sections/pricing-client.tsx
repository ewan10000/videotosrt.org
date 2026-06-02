"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

const plans = [
  {
    name: "Starter",
    meta: "For quick subtitle files and short one-off videos.",
    monthly: "Free",
    annual: "Free",
    suffix: "",
    features: ["30 minutes per month", "SRT, VTT, and TXT export", "Inline subtitle editor", "Export with email login"]
  },
  {
    name: "Pro",
    meta: "For creators and small teams publishing video every week.",
    monthly: "$9",
    annual: "$90",
    suffix: "/mo",
    featured: true,
    features: ["10 hours per month", "Burn-in export preview", "Style templates", "Batch processing"]
  },
  {
    name: "Business",
    meta: "For agencies, course teams, and product media groups.",
    monthly: "$29",
    annual: "$290",
    suffix: "/mo",
    features: ["50 hours per month", "Team seats", "API access", "Brand templates"]
  }
];

export function PricingClient() {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [loadingPlan, setLoadingPlan] = useState<"pro" | "business" | null>(null);

  async function startCheckout(plan: "pro" | "business") {
    setLoadingPlan(plan);
    try {
      const data = await api.checkout(plan);
      const url = data.url ?? data.checkout_url ?? data.sessionUrl;

      if (!url) {
        throw new Error("Checkout is not available right now. Please try again later.");
      }

      window.location.href = url;
    } catch (error) {
      alert(error instanceof Error ? error.message : "Could not start checkout. Please try again.");
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <>
      <header className="border-b border-soft/15 py-[72px]">
        <div className="site-container grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <span className="eyebrow"><span className="dot" /> Simple subtitle pricing</span>
            <h1 className="mb-4 mt-5 max-w-[760px] text-[clamp(42px,6vw,68px)] font-extrabold leading-[1]">Plans that match your subtitle volume.</h1>
            <p className="mb-0 max-w-[720px] text-lg leading-[1.7] text-muted">
              Start with free subtitle exports, move into burn-in and batch workflows when volume grows, or add team controls and API access for production work.
            </p>
          </div>
          <div className="rounded border border-line bg-panel p-2">
            <div className="grid grid-cols-2 gap-1">
              {(["monthly", "annual"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setBilling(item)}
                  className={`min-h-11 rounded px-5 text-sm font-extrabold capitalize ${billing === item ? "bg-indigo text-white" : "text-soft"}`}
                >
                  {item === "monthly" ? "Monthly" : "Annual"}
                </button>
              ))}
            </div>
            <p className="mb-0 mt-2 text-center text-xs font-semibold text-cyan">Annual saves two months</p>
          </div>
        </div>
      </header>
      <section id="pricing" className="section-pad">
        <div className="site-container">
          <div className="section-head">
            <h2>Choose a plan.</h2>
            <p>Every plan includes the focused VideoToSRT editor and export controls for clean caption handoff.</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {plans.map((plan) => (
              <article key={plan.name} className={`panel-card p-[22px] ${plan.featured ? "border-cyan bg-cyan/[.045] shadow-panel" : ""}`}>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="mb-0 text-xl font-extrabold">{plan.name}</h3>
                  {plan.featured ? <span className="rounded bg-cyan/10 px-3 py-1 text-xs font-extrabold text-cyan">Popular</span> : null}
                </div>
                <p className="mb-5 min-h-12 text-sm leading-6 text-muted">{plan.meta}</p>
                <div className="mb-5 text-5xl font-extrabold">
                  {billing === "monthly" ? plan.monthly : plan.annual}
                  {plan.suffix ? <span className="text-base text-soft">{billing === "monthly" ? "/mo" : "/yr"}</span> : null}
                </div>
                <ul className="mb-6 grid gap-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2 text-sm text-muted"><Check className="h-4 w-4 shrink-0 text-success" />{feature}</li>
                  ))}
                </ul>
                {plan.name === "Starter" ? (
                  <Link className="inline-flex min-h-[42px] w-full items-center justify-center rounded border border-line bg-white/[.03] px-4 text-sm font-bold" href="/#upload">
                    Start free
                  </Link>
                ) : (
                  <Button
                    variant={plan.featured ? "primary" : "secondary"}
                    className="w-full"
                    type="button"
                    disabled={loadingPlan !== null}
                    onClick={() => startCheckout(plan.name === "Pro" ? "pro" : "business")}
                  >
                    {loadingPlan === (plan.name === "Pro" ? "pro" : "business")
                      ? "Opening checkout..."
                      : plan.name === "Pro"
                        ? "Start Pro"
                        : "Start Business"}
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
                {["$5 2 hours", "$12 5 hours", "$39 20 hours"].map((chip) => (
                  <span key={chip} className="rounded border border-line bg-panel-2 px-4 py-2 text-sm font-extrabold text-cyan">{chip}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
