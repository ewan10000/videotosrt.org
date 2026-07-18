import { Footer } from "@/components/footer";
import { SeoLanding } from "@/components/sections/seo-landing";
import { JsonLd } from "@/components/seo/json-ld";
import { SiteNav } from "@/components/site-nav";
import { createLandingJsonLd, createLandingMetadata, getLandingPage } from "@/lib/seo-landing-pages";

const page = getLandingPage("video-to-text");
export const metadata = createLandingMetadata(page);
const pageJsonLd = createLandingJsonLd(page);

export default function VideoToTextPage() {
  return (
    <>
      <JsonLd data={pageJsonLd} />
      <SiteNav />
      <main>
        <SeoLanding {...page} />
      </main>
      <Footer />
    </>
  );
}
