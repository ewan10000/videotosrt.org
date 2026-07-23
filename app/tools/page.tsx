import Link from "next/link";
import { Footer } from "@/components/footer";
import { JsonLd } from "@/components/seo/json-ld";
import { SiteNav } from "@/components/site-nav";
import { createBreadcrumbJsonLd, createPageJsonLd, createPageMetadata } from "@/lib/metadata";

const tools = [
  ["/video-to-srt", "Video to SRT", "Upload local video, generate timed subtitles with AI after Google sign-in, edit, and export SRT."],
  ["/audio-to-srt", "Audio to SRT", "Turn local audio into editable timed subtitle rows and export SRT."],
  ["/mp4-to-srt", "MP4 to SRT", "Use local MP4 uploads for AI subtitle drafting, manual cleanup, and SRT export."],
  ["/video-to-text", "Video to Text", "Generate a transcript from local video and export TXT, SRT, or VTT."],
  ["/audio-to-text", "Audio to Text", "Create editable text from local audio with TXT export."],
  ["/video-to-vtt", "Video to VTT", "Create WebVTT captions from local video and review timing before export."],
  ["/srt-editor", "SRT Editor", "Edit subtitle text and timing, then export SRT, VTT, or TXT."]
];

export const metadata = createPageMetadata({
  path: "/tools",
  title: "Subtitle Tools",
  description: "Real VideoToSRT tools available today: local upload, AI transcription after Google sign-in, subtitle editing, and SRT, VTT, or TXT export."
});

const pageJsonLd = createPageJsonLd({
  path: "/tools",
  name: "Subtitle Tools",
  description: "Real VideoToSRT tools available today: local upload, AI transcription after Google sign-in, subtitle editing, and SRT, VTT, or TXT export.",
  extraNodes: [createBreadcrumbJsonLd({ path: "/tools", name: "Subtitle Tools" })]
});

export default function ToolsPage() {
  return (
    <>
      <JsonLd data={pageJsonLd} />
      <SiteNav />
      <main>
        <header className="border-b border-soft/15 py-[72px]">
          <div className="site-container">
            <span className="eyebrow"><span className="dot" /> Available tools</span>
            <h1 className="mb-4 mt-5 max-w-[760px] text-[clamp(42px,6vw,68px)] font-extrabold leading-[1]">Subtitle Tools You Can Use Today</h1>
            <p className="mb-0 max-w-[760px] text-lg leading-[1.7] text-muted">
              These tools reflect current product abilities only: local media upload, AI transcription with Google sign-in, inline editing, and SRT, VTT, or TXT export. AI transcription has a 1 GB technical file-size limit in addition to minute quotas.
            </p>
          </div>
        </header>
        <section className="section-pad">
          <div className="site-container grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tools.map(([href, title, body]) => (
              <Link key={href} className="panel-card p-[22px] transition hover:-translate-y-px hover:border-cyan" href={href}>
                <h2 className="mb-3 text-xl font-extrabold">{title}</h2>
                <p className="mb-0 leading-[1.65] text-muted">{body}</p>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
