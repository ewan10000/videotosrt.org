import type { Metadata } from "next";
import { Footer } from "@/components/footer";
import { SeoLanding } from "@/components/sections/seo-landing";
import { SiteNav } from "@/components/site-nav";

export const metadata: Metadata = {
  title: "Translate Subtitles Online — SRT Translation",
  description: "Upload SRT, translate to 50+ languages. Edit inline, preserve timing, export localized files.",
  alternates: { canonical: "/subtitle-translator" }
};

export default function SubtitleTranslatorPage() {
  return (
    <>
      <SiteNav />
      <main>
        <SeoLanding
          title="Translate Subtitles Online — SRT Translation"
          description="Translate subtitle files while preserving timing. Review every line inline before exporting localized SRT files."
          bullets={["Translate subtitles into 50+ languages.", "Keep timestamps intact.", "Edit localized captions before export."]}
          cta={{ label: "Open Editor", href: "/editor" }}
          links={[{ label: "Course Captions", href: "/course-captions" }, { label: "SRT Editor", href: "/srt-editor" }, { label: "Video to SRT", href: "/video-to-srt" }]}
        />
      </main>
      <Footer />
    </>
  );
}
