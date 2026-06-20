import { Footer } from "@/components/footer";
import { SeoLanding } from "@/components/sections/seo-landing";
import { JsonLd } from "@/components/seo/json-ld";
import { SiteNav } from "@/components/site-nav";
import { createLandingJsonLd, createLandingMetadata, getLandingPage } from "@/lib/seo-landing-pages";

const page = getLandingPage("ass-subtitle-editor");
export const metadata = createLandingMetadata(page);
const pageJsonLd = createLandingJsonLd(page);

export default function AssSubtitleEditorPage() {
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
