import type { Metadata } from "next";
import { Footer } from "@/components/footer";
import { SeoLanding } from "@/components/sections/seo-landing";
import { SiteNav } from "@/components/site-nav";

export const metadata: Metadata = {
  title: "TikTok Subtitle Generator — Styled Captions",
  description: "Vertical video captions with ASS styling. Auto-break lines, preview in browser, export ready-to-post.",
  alternates: { canonical: "/tiktok-subtitles" }
};

export default function TiktokSubtitlesPage() {
  return (
    <>
      <SiteNav />
      <main>
        <SeoLanding
          title="TikTok Subtitle Generator — Styled Captions"
          description="Generate captions for vertical videos, edit the wording, and prepare styled subtitles for short-form platforms."
          bullets={["Built for vertical captions.", "ASS styling for fonts, color, and positioning.", "Export ready-to-post subtitles from your browser."]}
          cta={{ label: "Upload Video — Free", href: "/#upload" }}
          links={[{ label: "Burn Subtitles", href: "/burn-subtitles" }, { label: "ASS Subtitle Editor", href: "/ass-subtitle-editor" }, { label: "Video to SRT", href: "/video-to-srt" }]}
        />
      </main>
      <Footer />
    </>
  );
}
