import { Footer } from "@/components/footer";
import { FaqSection } from "@/components/sections/home-sections";
import { PricingClient } from "@/components/sections/pricing-client";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { HomeNoscriptContent } from "@/components/seo/noscript-content";
import { JsonLd } from "@/components/seo/json-ld";
import { createPageMetadata } from "@/lib/metadata";
import { SiteNav } from "@/components/site-nav";

export const metadata = createPageMetadata({
  path: "/pricing",
  title: "Pricing",
  description: "VideoToSRT pricing: free subtitle exports, Pro creator plan at $9/mo, and Studio team workflow at $29/mo. No watermark. 50+ languages."
});

const pricingOffersJsonLd = {
  "@context": "https://schema.org",
  "@type": "OfferCatalog",
  name: "VideoToSRT Pricing",
  url: "https://videotosrt.org/pricing",
  itemListElement: [
    { name: "Free", price: "0" },
    { name: "Pro", price: "9" },
    { name: "Studio", price: "29" }
  ].map((offer) => ({
    "@type": "Offer",
    name: offer.name,
    price: offer.price,
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
    url: "https://videotosrt.org/pricing"
  }))
};

export default function PricingPage() {
  return (
    <>
      <JsonLd data={pricingOffersJsonLd} />
      <HomeNoscriptContent />
      <SiteNav active="pricing" />
      <Breadcrumbs items={[{ label: "Pricing", href: "/pricing" }]} />
      <main>
        <PricingClient />
        <FaqSection />
      </main>
      <Footer />
    </>
  );
}
