import type { Metadata } from "next";
import { Footer } from "@/components/footer";
import { SeoLanding } from "@/components/sections/seo-landing";
import { SiteNav } from "@/components/site-nav";

export const metadata: Metadata = {
  title: "Podcast Transcription to SRT — Online",
  description: "Audio-optimized transcription with speaker detection. Clean SRTs for show notes and distribution.",
  alternates: { canonical: "/podcast-transcription" }
};

export default function PodcastTranscriptionPage() {
  return (
    <>
      <SiteNav />
      <main>
        <SeoLanding
          title="Podcast Transcription to SRT — Online"
          description="Turn podcast audio into editable subtitles and transcripts for clips, show notes, and distribution workflows."
          bullets={["Upload audio or paste a media link.", "Clean transcript lines inline.", "Export SRT, VTT, or TXT for every episode."]}
          cta={{ label: "Upload Audio — Free", href: "/#upload" }}
          links={[{ label: "YouTube Subtitles", href: "/youtube-subtitles" }, { label: "SRT Editor", href: "/srt-editor" }, { label: "Course Captions", href: "/course-captions" }]}
        />
      </main>
      <Footer />
    </>
  );
}
