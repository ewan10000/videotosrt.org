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
import { createPageJsonLd, createPageMetadata } from "@/lib/metadata";
import { JsonLd } from "@/components/seo/json-ld";
import { SiteNav } from "@/components/site-nav";

export const metadata = createPageMetadata({
  path: "/",
  title: "VideoToSRT — Online Subtitle Editor",
  description: "Upload, transcribe, edit, and export subtitles in your browser. AI transcription, inline editor, and SRT, VTT, or TXT export."
});

const homeJsonLd = createPageJsonLd({
  path: "/",
  name: "VideoToSRT — Online Subtitle Editor",
  description: "Upload, transcribe, edit, and export subtitles in your browser. AI transcription, inline editor, and SRT, VTT, or TXT export.",
  extraNodes: [
    {
      "@type": "SoftwareApplication",
      name: "VideoToSRT",
      applicationCategory: "VideoApplication",
      operatingSystem: "Web",
      url: "https://videotosrt.org",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        { "@type": "Question", name: "Do I need to create an account?", acceptedAnswer: { "@type": "Answer", text: "Local upload, preview, and manual editing can start before sign-in. AI transcription, account export, checkout, and paid usage require Google sign-in." } },
        { "@type": "Question", name: "What formats can I export?", acceptedAnswer: { "@type": "Answer", text: "SRT, VTT, and TXT are available today." } },
        { "@type": "Question", name: "Can I edit an existing SRT file?", acceptedAnswer: { "@type": "Answer", text: "Yes. Upload your SRT alongside the video, or paste it directly into the editor. Fix timing without touching code." } }
      ]
    }
  ]
});

export default function HomePage() {
  return (
    <>
      <JsonLd data={homeJsonLd} />
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
