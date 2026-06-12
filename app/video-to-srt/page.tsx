import { Footer } from "@/components/footer";
import { SeoLanding } from "@/components/sections/seo-landing";
import { createPageMetadata } from "@/lib/metadata";
import { SiteNav } from "@/components/site-nav";

export const metadata = createPageMetadata({
  path: "/video-to-srt",
  title: "Video to SRT Converter — Free Online",
  description: "Convert any video to SRT in seconds. AI-powered, editable inline, export clean subtitles. No download required."
});

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
          links={[{ label: "SRT Editor", href: "/srt-editor" }, { label: "Public URL Subtitles", href: "/public-url-subtitles" }, { label: "Burn Subtitles", href: "/burn-subtitles" }]}
        />
      </main>
      <Footer />
    </>
  );
}
