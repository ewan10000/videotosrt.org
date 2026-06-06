import { Footer } from "@/components/footer";
import { FaqSection } from "@/components/sections/home-sections";
import { PricingClient } from "@/components/sections/pricing-client";
import { createPageMetadata } from "@/lib/metadata";
import { SiteNav } from "@/components/site-nav";

export const metadata = createPageMetadata({
  path: "/pricing",
  title: "Pricing",
  description: "VideoToSRT pricing for free subtitle exports, creator workflows, and team subtitle production."
});

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
