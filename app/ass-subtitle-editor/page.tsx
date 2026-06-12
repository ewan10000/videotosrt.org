import { Footer } from "@/components/footer";
import { SeoLanding } from "@/components/sections/seo-landing";
import { createPageMetadata } from "@/lib/metadata";
import { SiteNav } from "@/components/site-nav";

export const metadata = createPageMetadata({
  path: "/ass-subtitle-editor",
  title: "ASS Subtitle Editor Online — Styled Subtitles",
  description: "Full ASS style editing: fonts, colors, positioning, animation. Preview and export studio-grade subtitles."
});

export default function AssSubtitleEditorPage() {
  return (
    <>
      <SiteNav />
      <main>
        <SeoLanding
          title="ASS Subtitle Editor Online — Styled Subtitles"
          description="Create styled subtitles with fonts, colors, positioning, and preview controls from a browser-based editor."
          bullets={["Style ASS/SSA subtitles without desktop software.", "Preview positioning and readability.", "Export studio-grade subtitle files."]}
          cta={{ label: "Open Editor", href: "/editor" }}
          links={[{ label: "Burn Subtitles", href: "/burn-subtitles" }, { label: "Short-form Subtitles", href: "/short-form-subtitles" }, { label: "SRT Editor", href: "/srt-editor" }]}
        />
      </main>
      <Footer />
    </>
  );
}
