import type { Metadata } from "next";
import { Footer } from "@/components/footer";
import { SeoLanding } from "@/components/sections/seo-landing";
import { SiteNav } from "@/components/site-nav";

export const metadata: Metadata = {
  title: "Burn Subtitles into Video Online — Hardcode MP4",
  description: "Hardcode SRT into MP4. Styled or plain, one export, play anywhere. Pro plan and up.",
  alternates: { canonical: "/burn-subtitles" }
};

export default function BurnSubtitlesPage() {
  return (
    <>
      <SiteNav />
      <main>
        <SeoLanding
          title="Burn Subtitles into Video Online — Hardcode MP4"
          description="Turn subtitles into an MP4 that plays anywhere. Use styled or plain captions and ship one file for every platform."
          bullets={["Hardcode subtitles into MP4.", "Preview captions before export.", "Use burn-in export on paid plans."]}
          cta={{ label: "See Pricing", href: "/pricing" }}
          links={[{ label: "Video to SRT", href: "/video-to-srt" }, { label: "TikTok Subtitles", href: "/tiktok-subtitles" }, { label: "ASS Subtitle Editor", href: "/ass-subtitle-editor" }]}
        />
      </main>
      <Footer />
    </>
  );
}
