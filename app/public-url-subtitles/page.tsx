import { Footer } from "@/components/footer";
import { SeoLanding } from "@/components/sections/seo-landing";
import { createPageMetadata } from "@/lib/metadata";
import { SiteNav } from "@/components/site-nav";

export const metadata = createPageMetadata({
  path: "/public-url-subtitles",
  title: "Public URL Subtitle Editor — Auto-Generate & Edit",
  description: "Paste a public video URL, get editable subtitles, fix captions, and export SRT."
});

export default function PublicUrlSubtitlesPage() {
  return (
    <>
      <SiteNav />
      <main>
        <SeoLanding
          title="Public URL Subtitle Editor — Auto-Generate & Edit"
          description="Paste a public video URL, generate editable subtitles, clean the rough lines, and export SRT when you have permission to process the content."
          bullets={["Import from a public video URL.", "Fix captions inline beside the preview.", "Export SRT, VTT, or TXT when the subtitles are clean."]}
          cta={{ label: "Upload Video — Free", href: "/#upload" }}
          links={[{ label: "Video to SRT", href: "/video-to-srt" }, { label: "SRT Editor", href: "/srt-editor" }, { label: "Podcast Transcription", href: "/podcast-transcription" }]}
        />
      </main>
      <Footer />
    </>
  );
}
