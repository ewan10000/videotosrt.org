import type { Metadata } from "next";
import { Footer } from "@/components/footer";
import { FaqSection } from "@/components/sections/home-sections";
import { PricingClient } from "@/components/sections/pricing-client";
import { SiteNav } from "@/components/site-nav";

export const metadata: Metadata = {
  title: "Pricing",
  description: "VideoToSRT pricing for free subtitle exports, creator workflows, and team subtitle production.",
  alternates: { canonical: "/pricing" }
};

export default function PricingPage() {
  return (
    <>
      <SiteNav active="pricing" />
      <main>
        <PricingClient />
        <FaqSection />
      </main>
      <Footer />
    </>
  );
}
