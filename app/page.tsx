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
  description: "Upload, edit, and export subtitles in your browser. AI transcription + inline editor. SRT, VTT, ASS. No software, no sign-up."
});

const homeJsonLd = createPageJsonLd({
  path: "/",
  name: "VideoToSRT — Online Subtitle Editor",
  description: "Upload, edit, and export subtitles in your browser. AI transcription + inline editor. SRT, VTT, ASS. No software, no sign-up.",
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
        { "@type": "Question", name: "Do I need to create an account?", acceptedAnswer: { "@type": "Answer", text: "No. Upload and edit immediately. We only ask for your email when you hit Export — so we can send you the file." } },
        { "@type": "Question", name: "What formats can I export?", acceptedAnswer: { "@type": "Answer", text: "SRT, VTT, and TXT are available today. ASS/SSA styled export and MP4 burn-in export are coming soon for paid plans." } },
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
