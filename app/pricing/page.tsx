import { Footer } from "@/components/footer";
import { FaqSection } from "@/components/sections/home-sections";
import { PricingClient } from "@/components/sections/pricing-client";
import { createPageJsonLd, createPageMetadata } from "@/lib/metadata";
import { JsonLd } from "@/components/seo/json-ld";
import { SiteNav } from "@/components/site-nav";

export const metadata = createPageMetadata({
  path: "/pricing",
  title: "Pricing",
  description: "VideoToSRT pricing for free subtitle exports, creator workflows, and team subtitle production."
});
const pageJsonLd = createPageJsonLd({
  path: "/pricing",
  name: "Pricing",
  description: "VideoToSRT pricing for free subtitle exports, creator workflows, and team subtitle production."
});


export default function PricingPage() {
  return (
    <>
      <JsonLd data={pageJsonLd} />
      <SiteNav active="pricing" />
      <main>
        <PricingClient />
        <FaqSection />
      </main>
      <Footer />
    </>
  );
}
