import { Footer } from "@/components/footer";
import {
  EditorPreviewSection,
  FaqSection,
  FeaturesSection,
  FinalCtaSection,
  HeroSection,
  PricingTeaserSection,
  StatusSection,
  UseCasesSection,
  WorkflowSection
} from "@/components/sections/home-sections";
import { createPageMetadata } from "@/lib/metadata";
import { SiteNav } from "@/components/site-nav";

export const metadata = createPageMetadata({
  path: "/",
  title: "VideoToSRT — Online Subtitle Editor",
  description: "Upload, edit, and export subtitles in your browser. AI transcription + inline editor. SRT, VTT, ASS. No software, no sign-up."
});

const homeJsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "VideoToSRT",
    url: "https://videotosrt.org"
  },
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "VideoToSRT — Online Subtitle Editor",
    url: "https://videotosrt.org",
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: ["h1", ".section-head p"]
    }
  }
];

export default function HomePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd) }} />
      <SiteNav active="home" />
      <main>
        <HeroSection />
        <WorkflowSection />
        <EditorPreviewSection />
        <FeaturesSection />
        <UseCasesSection />
        <StatusSection />
        <PricingTeaserSection />
        <FaqSection />
        <FinalCtaSection />
      </main>
      <Footer />
    </>
  );
}
