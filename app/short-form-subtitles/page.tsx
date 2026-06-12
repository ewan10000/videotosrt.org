import { Footer } from "@/components/footer";
import { SeoLanding } from "@/components/sections/seo-landing";
import { createPageMetadata } from "@/lib/metadata";
import { SiteNav } from "@/components/site-nav";

export const metadata = createPageMetadata({
  path: "/short-form-subtitles",
  title: "Short-form Subtitle Generator — Styled Captions",
  description: "Vertical video captions with ASS styling. Auto-break lines, preview in browser, export ready-to-post."
});

export default function ShortFormSubtitlesPage() {
  return (
    <>
      <SiteNav />
      <main>
        <SeoLanding
          title="Short-form Subtitle Generator — Styled Captions"
          description="Generate captions for vertical videos, edit the wording, and prepare styled subtitles for short-form platforms."
          bullets={["Built for vertical captions.", "ASS styling for fonts, color, and positioning.", "Export ready-to-post subtitles from your browser."]}
          cta={{ label: "Upload Video — Free", href: "/#upload" }}
          links={[{ label: "Burn Subtitles", href: "/burn-subtitles" }, { label: "ASS Subtitle Editor", href: "/ass-subtitle-editor" }, { label: "Video to SRT", href: "/video-to-srt" }]}
        />
      </main>
      <Footer />
    </>
  );
}
