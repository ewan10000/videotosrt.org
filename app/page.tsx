import type { Metadata } from "next";
import { Footer } from "@/components/footer";
import {
  EditorPreviewSection,
  FaqSection,
  FeaturesSection,
  HeroSection,
  PricingTeaserSection,
  StatusSection,
  WorkflowSection
} from "@/components/sections/home-sections";
import { SiteNav } from "@/components/site-nav";

export const metadata: Metadata = {
  title: "AI Subtitle Editor",
  description: "Upload video, edit AI-generated subtitles inline, and export SRT, VTT, or TXT from your browser.",
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
        <StatusSection />
        <PricingTeaserSection />
        <FaqSection />
      </main>
      <Footer />
    </>
  );
}
