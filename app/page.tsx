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
import { HomeNoscriptContent } from "@/components/seo/noscript-content";
import { JsonLd } from "@/components/seo/json-ld";
import { createPageMetadata } from "@/lib/metadata";
import { SiteNav } from "@/components/site-nav";

export const metadata = createPageMetadata({
  path: "/",
  title: "VideoToSRT - Online Subtitle Editor",
  description: "Upload, edit, and export subtitles in your browser. AI transcription + inline editor. SRT, VTT, ASS. No software. Free to edit."
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
    name: "VideoToSRT - Online Subtitle Editor",
    url: "https://videotosrt.org",
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: ["main h1", "#faq"]
    }
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "VideoToSRT",
    applicationCategory: "VideoApplication",
    operatingSystem: "Web",
    url: "https://videotosrt.org",
    offers: {
      "@type": "AggregateOffer",
      url: "https://videotosrt.org/pricing",
      priceCurrency: "USD",
      lowPrice: "0",
      highPrice: "29"
    }
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      ["Do I need to create an account?", "Yes. Sign in to upload and transcribe media. Editing remains free, and exports use your account email."],
      ["What formats can I export?", "SRT, VTT, TXT. ASS/SSA styled export and MP4 burn-in are available on paid plans."],
      ["How accurate is transcription?", "Powered by Whisper. 95%+ for clear audio. Every line is editable inline, so perfect accuracy is one click away."],
      ["Can I use exported subtitles commercially?", "Yes. Everything you export is yours. We do not watermark, claim rights, or look at your content."],
      ["What happens to my video after upload?", "Processed and deleted automatically. Anonymous projects expire in 7 days."],
      ["Is there a file size limit?", "2GB per file for uploads. URL imports have no size limit."],
      ["Can I edit an existing SRT file?", "Yes. Upload your SRT alongside the video, or paste it directly into the editor."],
      ["What's the difference between Free and Pro?", "Free gives you 30 minutes a month and basic formats. Pro unlocks burn-in, style templates, and 10 hours."],
      ["Does the pay-as-you-go credit expire?", "Never. Buy once, use whenever."],
      ["Can my team share templates and projects?", "Studio supports 3 team members with shared brand templates and cloud history."]
    ].map(([name, text]) => ({
      "@type": "Question",
      name,
      acceptedAnswer: { "@type": "Answer", text }
    }))
  }
];

export default function HomePage() {
  return (
    <>
      <JsonLd data={homeJsonLd} />
      <HomeNoscriptContent />
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
