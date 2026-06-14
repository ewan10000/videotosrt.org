import { Footer } from "@/components/footer";
import { SeoLanding } from "@/components/sections/seo-landing";
import { createPageJsonLd, createPageMetadata } from "@/lib/metadata";
import { JsonLd } from "@/components/seo/json-ld";
import { SiteNav } from "@/components/site-nav";

export const metadata = createPageMetadata({
  path: "/podcast-transcription",
  title: "Podcast Transcription to SRT — Online",
  description: "Audio-optimized transcription with speaker detection. Clean SRTs for show notes and distribution."
});
const pageJsonLd = createPageJsonLd({
  path: "/podcast-transcription",
  name: "Podcast Transcription to SRT — Online",
  description: "Audio-optimized transcription with speaker detection. Clean SRTs for show notes and distribution."
});


export default function PodcastTranscriptionPage() {
  return (
    <>
      <JsonLd data={pageJsonLd} />
      <SiteNav />
      <main>
        <SeoLanding
          title="Podcast Transcription to SRT — Online"
          description="Turn podcast audio into editable subtitles and transcripts for clips, show notes, and distribution workflows."
          bullets={["Upload audio or paste a media link.", "Clean transcript lines inline.", "Export SRT, VTT, or TXT for every episode."]}
          cta={{ label: "Upload Audio — Free", href: "/#upload" }}
          links={[{ label: "Public URL Subtitles", href: "/public-url-subtitles" }, { label: "SRT Editor", href: "/srt-editor" }, { label: "Course Captions", href: "/course-captions" }]}
        />
      </main>
      <Footer />
    </>
  );
}
