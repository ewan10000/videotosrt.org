import { Footer } from "@/components/footer";
import { SeoLanding } from "@/components/sections/seo-landing";
import { createPageJsonLd, createPageMetadata } from "@/lib/metadata";
import { JsonLd } from "@/components/seo/json-ld";
import { SiteNav } from "@/components/site-nav";

export const metadata = createPageMetadata({
  path: "/srt-editor",
  title: "SRT Editor Online — Edit Subtitles in Browser",
  description: "Fix timing and text without installing software. Upload your SRT, sync with video, export perfect files."
});
const pageJsonLd = createPageJsonLd({
  path: "/srt-editor",
  name: "SRT Editor Online — Edit Subtitles in Browser",
  description: "Fix timing and text without installing software. Upload your SRT, sync with video, export perfect files."
});


export default function SrtEditorPage() {
  return (
    <>
      <JsonLd data={pageJsonLd} />
      <SiteNav />
      <main>
        <SeoLanding
          title="SRT Editor Online — Edit Subtitles in Browser"
          description="Fix subtitle text and timing without leaving your browser. Keep the video preview and captions in one focused workspace."
          bullets={["Click any line to fix text.", "Nudge timestamps while previewing the video.", "Export clean SRT, VTT, or TXT files."]}
          cta={{ label: "Open Editor", href: "/editor" }}
          links={[{ label: "Video to SRT", href: "/video-to-srt" }, { label: "ASS Subtitle Editor", href: "/ass-subtitle-editor" }, { label: "Subtitle Translator", href: "/subtitle-translator" }]}
        />
      </main>
      <Footer />
    </>
  );
}
