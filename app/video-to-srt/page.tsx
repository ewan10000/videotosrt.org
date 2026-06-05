import type { Metadata } from "next";
import { Footer } from "@/components/footer";
import { SeoLanding } from "@/components/sections/seo-landing";
import { SiteNav } from "@/components/site-nav";

export const metadata: Metadata = {
  title: "Video to SRT Converter — Free Online",
  description: "Convert any video to SRT in seconds. AI-powered, editable inline, export clean subtitles. No download required.",
  alternates: { canonical: "/video-to-srt" }
};

export default function VideoToSrtPage() {
  return (
    <>
      <SiteNav />
      <main>
        <SeoLanding
          title="Video to SRT Converter — Free Online"
          description="Convert any video to SRT in seconds. Upload, transcribe, edit, and export clean subtitle files from your browser."
          bullets={["AI transcription in 50+ languages.", "Inline editing for text and timing.", "Export SRT, VTT, or TXT without installing software."]}
          cta={{ label: "Upload Video — Free", href: "/#upload" }}
          links={[{ label: "SRT Editor", href: "/srt-editor" }, { label: "YouTube Subtitles", href: "/youtube-subtitles" }, { label: "Burn Subtitles", href: "/burn-subtitles" }]}
        />
      </main>
      <Footer />
    </>
  );
}
