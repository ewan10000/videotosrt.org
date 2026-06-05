import type { Metadata } from "next";
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
import { SiteNav } from "@/components/site-nav";

export const metadata: Metadata = {
  title: "VideoToSRT — Online Subtitle Editor & Burn-in Tool",
  description: "Upload, edit, and export subtitles in your browser. AI transcription + inline editor. SRT, VTT, ASS. No software, no sign-up.",
  alternates: { canonical: "/" }
};

export default function HomePage() {
  return (
    <>
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
