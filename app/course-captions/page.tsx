import { Footer } from "@/components/footer";
import { SeoLanding } from "@/components/sections/seo-landing";
import { createPageMetadata } from "@/lib/metadata";
import { SiteNav } from "@/components/site-nav";

export const metadata = createPageMetadata({
  path: "/course-captions",
  title: "Online Course Caption Generator — Educators",
  description: "Batch process lectures, export multi-language captions. VTT for players, SRT for downloads."
});

export default function CourseCaptionsPage() {
  return (
    <>
      <SiteNav />
      <main>
        <SeoLanding
          title="Online Course Caption Generator — Educators"
          description="Create captions for lessons, lectures, and training videos. Export VTT for players and SRT for downloads."
          bullets={["Batch process course videos.", "Support learners across 50+ languages.", "Keep timing and wording easy to review."]}
          cta={{ label: "Upload Video — Free", href: "/#upload" }}
          links={[{ label: "Subtitle Translator", href: "/subtitle-translator" }, { label: "Podcast Transcription", href: "/podcast-transcription" }, { label: "SRT Editor", href: "/srt-editor" }]}
        />
      </main>
      <Footer />
    </>
  );
}
