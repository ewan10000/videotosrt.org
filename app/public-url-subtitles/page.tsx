import { Footer } from "@/components/footer";
import { SeoLanding } from "@/components/sections/seo-landing";
import { createPageJsonLd, createPageMetadata } from "@/lib/metadata";
import { JsonLd } from "@/components/seo/json-ld";
import { SiteNav } from "@/components/site-nav";

export const metadata = createPageMetadata({
  path: "/public-url-subtitles",
  title: "Public URL Subtitle Editor — Auto-Generate & Edit",
  description: "Paste a public video URL, get editable subtitles, fix captions, and export SRT."
});
const pageJsonLd = createPageJsonLd({
  path: "/public-url-subtitles",
  name: "Public URL Subtitle Editor — Auto-Generate & Edit",
  description: "Paste a public video URL, get editable subtitles, fix captions, and export SRT."
});


export default function PublicUrlSubtitlesPage() {
  return (
    <>
      <JsonLd data={pageJsonLd} />
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
