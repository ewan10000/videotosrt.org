import { Footer } from "@/components/footer";
import { SeoLanding } from "@/components/sections/seo-landing";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { createPageMetadata } from "@/lib/metadata";
import { SiteNav } from "@/components/site-nav";

export const metadata = createPageMetadata({
  path: "/video-to-srt",
  title: "Video to SRT Converter — Free Online",
  description: "Convert any video to SRT in seconds. AI-powered, editable inline, export clean subtitles. No download required."
});

const howToJsonLd = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "3 steps to convert video to SRT",
  description: "Upload a video, edit generated subtitles, and export an SRT file in VideoToSRT.",
  totalTime: "PT1M",
  step: [
    {
      "@type": "HowToStep",
      name: "Upload",
      text: "Upload a video or audio file in your browser."
    },
    {
      "@type": "HowToStep",
      name: "Edit",
      text: "Review the generated transcript and adjust subtitle text or timing inline."
    },
    {
      "@type": "HowToStep",
      name: "Export",
      text: "Export a clean SRT subtitle file."
    }
  ]
};

export default function VideoToSrtPage() {
  return (
    <>
      <JsonLd data={howToJsonLd} />
      <SiteNav />
      <Breadcrumbs items={[{ label: "Video to SRT", href: "/video-to-srt" }]} />
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
