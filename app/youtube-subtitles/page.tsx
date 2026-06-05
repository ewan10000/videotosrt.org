import type { Metadata } from "next";
import { Footer } from "@/components/footer";
import { SeoLanding } from "@/components/sections/seo-landing";
import { SiteNav } from "@/components/site-nav";

export const metadata: Metadata = {
  title: "YouTube Subtitle Editor — Auto-Generate & Edit",
  description: "Paste a YouTube link, get editable subtitles. Fix auto-captions, export SRT, re-upload.",
  alternates: { canonical: "/youtube-subtitles" }
};

export default function YoutubeSubtitlesPage() {
  return (
    <>
      <SiteNav />
      <main>
        <SeoLanding
          title="YouTube Subtitle Editor — Auto-Generate & Edit"
          description="Paste a YouTube link, generate editable subtitles, clean the rough lines, and export SRT for upload."
          bullets={["Import from a YouTube link.", "Fix captions inline beside the preview.", "Export SRT, VTT, or TXT when the subtitles are clean."]}
          cta={{ label: "Upload Video — Free", href: "/#upload" }}
          links={[{ label: "Video to SRT", href: "/video-to-srt" }, { label: "SRT Editor", href: "/srt-editor" }, { label: "Podcast Transcription", href: "/podcast-transcription" }]}
        />
      </main>
      <Footer />
    </>
  );
}
