import { Footer } from "@/components/footer";
import { SeoLanding } from "@/components/sections/seo-landing";
import { createPageJsonLd, createPageMetadata } from "@/lib/metadata";
import { JsonLd } from "@/components/seo/json-ld";
import { SiteNav } from "@/components/site-nav";

export const metadata = createPageMetadata({
  path: "/burn-subtitles",
  title: "Burn Subtitles into Video Online — Hardcode MP4",
  description: "Preview hardcoded subtitles for MP4 export. Styled or plain, one export workflow, built for paid plans."
});
const pageJsonLd = createPageJsonLd({
  path: "/burn-subtitles",
  name: "Burn Subtitles into Video Online — Hardcode MP4",
  description: "Preview hardcoded subtitles for MP4 export. Styled or plain, one export workflow, built for paid plans."
});


export default function BurnSubtitlesPage() {
  return (
    <>
      <JsonLd data={pageJsonLd} />
      <SiteNav />
      <main>
        <SeoLanding
          title="Burn Subtitles into Video Online — Hardcode MP4"
          description="Turn subtitles into an MP4 that plays anywhere. Use styled or plain captions and ship one file for every platform."
          bullets={["Preview hardcoded subtitles for MP4.", "Check captions before export.", "Use burn-in preview on paid plans."]}
          cta={{ label: "See Pricing", href: "/pricing" }}
          links={[{ label: "Video to SRT", href: "/video-to-srt" }, { label: "Short-form Subtitles", href: "/short-form-subtitles" }, { label: "ASS Subtitle Editor", href: "/ass-subtitle-editor" }]}
        />
      </main>
      <Footer />
    </>
  );
}
