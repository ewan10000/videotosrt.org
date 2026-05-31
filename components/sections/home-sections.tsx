import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowDown, Check, Scissors, Upload } from "lucide-react";
import { ExportModal } from "@/components/modals/export-modal";
import { Button } from "@/components/ui/button";
import { UploadStatus } from "@/components/upload-status";

const features = [
  ["AI", "Whisper transcription", "Generate time-aligned captions from video or audio in 50+ languages."],
  ["TC", "Timestamp control", "Adjust start and end times inline without leaving the preview."],
  ["GL", "Glossary support", "Keep product names, creator names, and technical terms consistent."],
  ["QA", "Subtitle quality checks", "Flag overlaps, long lines, fast reading speed, empty captions, and punctuation gaps."],
  ["EX", "Clean exports", "Download SRT, VTT, TXT, and styled subtitle files for publishing."],
  ["URL", "URL imports", "Start from YouTube, TikTok, Vimeo, or a direct media URL."]
];

const faqs = [
  ["Do I need to create an account?", "No. Upload and edit immediately. Email sign-in appears when you export."],
  ["What formats can I export?", "SRT, VTT, and TXT are supported for MVP. ASS/SSA and burn-in exports are planned paid workflows."],
  ["How accurate is transcription?", "VideoToSRT is designed around Whisper-style transcription and inline fixes for creator-grade cleanup."],
  ["Can I use exported subtitles commercially?", "Yes. Your exported subtitle files are yours to use in commercial projects."]
];

export function HeroSection() {
  return (
    <header className="border-b border-soft/15 py-[72px] pb-11">
      <div className="site-container grid items-center gap-[42px] lg:grid-cols-[minmax(0,.92fr)_minmax(430px,1.08fr)]">
        <div>
          <span className="eyebrow"><span className="dot" /> AI subtitle editing workspace</span>
          <h1 className="mb-[18px] mt-5 max-w-[780px] text-[clamp(42px,6vw,72px)] font-extrabold leading-[.98]">
            Generate, edit, and export accurate SRT subtitles.
          </h1>
          <p className="mb-7 mt-[22px] max-w-[660px] text-lg leading-[1.7] text-muted">
            VideoToSRT turns raw video into clean, time-aligned subtitles with a focused editor for fixing captions, syncing speaker timing, and exporting production-ready files.
          </p>
          <div className="mb-[30px] flex flex-wrap gap-3">
            <Link className="inline-flex min-h-[42px] items-center justify-center rounded bg-indigo px-4 text-sm font-bold text-text shadow-[0_12px_30px_rgba(99,102,241,.22)] transition hover:-translate-y-px" href="#upload">
              Upload video
            </Link>
            <Link className="inline-flex min-h-[42px] items-center justify-center rounded border border-line bg-white/[.03] px-4 text-sm font-bold text-text transition hover:-translate-y-px" href="#editor">
              View editor
            </Link>
          </div>
          <div className="grid max-w-[620px] grid-cols-1 gap-3 sm:grid-cols-3" aria-label="Product metrics">
            {["50+ languages", "No sign-up to edit", "VTT and TXT export"].map((metric, index) => (
              <div key={metric} className="rounded border border-line bg-white/[.025] p-[15px]">
                <strong className="mb-1 block text-[22px]">{index === 0 ? "50+" : index === 1 ? "0" : "3"}</strong>
                <span className="text-[13px] font-semibold text-soft">{metric}</span>
              </div>
            ))}
          </div>
        </div>
        <UploadPanel />
      </div>
    </header>
  );
}

function UploadPanel() {
  return (
    <div id="upload" className="overflow-hidden rounded border border-line bg-panel shadow-panel">
      <div className="window-bar">
        <div className="traffic" aria-hidden="true"><span /><span /><span /></div>
        <div className="text-[13px] font-bold text-soft">New subtitle project</div>
      </div>
      <div className="p-[22px]">
        <div className="grid min-h-[230px] place-items-center rounded border border-dashed border-cyan/60 bg-cyan/[.045] p-6 text-center">
          <div>
            <div className="mx-auto mb-[18px] grid h-[58px] w-[58px] place-items-center rounded bg-indigo text-[28px] font-extrabold text-white">
              <Upload className="h-7 w-7" />
            </div>
            <h2 className="mb-[9px] text-2xl font-extrabold leading-[1.2]">Drop your video here</h2>
            <p className="mx-auto mb-5 max-w-[410px] leading-[1.6] text-muted">
              MP4, MOV, M4A, MP3, or paste a YouTube, TikTok, Vimeo link. Up to 2GB per file.
            </p>
            <Button variant="primary">Choose file</Button>
          </div>
        </div>
        <div className="mt-[18px] grid grid-cols-[42px_1fr_auto] items-center gap-[13px] rounded border border-line bg-panel-2 p-[13px] max-sm:grid-cols-[42px_1fr]">
          <div className="grid h-[42px] w-[42px] place-items-center rounded bg-indigo/15 text-xs font-extrabold text-cyan">MP4</div>
          <div>
            <strong className="mb-1 block text-sm">creator-launch-video.mp4</strong>
            <span className="text-[13px] text-soft">1.2 GB · ready to transcribe</span>
          </div>
          <div className="h-2 w-28 overflow-hidden rounded-full bg-[#24324B] max-sm:col-span-2 max-sm:w-full" aria-label="Upload progress">
            <i className="block h-full w-[72%] bg-cyan" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function WorkflowSection() {
  const steps: Array<{ icon: LucideIcon; title: string; copy: string }> = [
    { icon: Upload, title: "Upload video or paste a link", copy: "AI transcribes in 50+ languages and keeps the source media attached." },
    { icon: Scissors, title: "Fix captions inline", copy: "Review every segment, adjust timing, and clean wording beside the preview." },
    { icon: ArrowDown, title: "Export clean files", copy: "Download SRT, VTT, TXT, or styled files for publishing workflows." }
  ];
  return (
    <section id="workflow" className="section-pad">
      <div className="site-container">
        <div className="section-head">
          <h2>From video upload to subtitle file in three steps.</h2>
          <p>Built around the real creator workflow: generate captions, fix the rough edges, and export files that platforms accept.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {steps.map(({ icon: Icon, title, copy }, index) => (
            <article key={title} className="panel-card p-[22px]">
              <div className="mb-[18px] grid h-[38px] w-[38px] place-items-center rounded bg-indigo/20 text-cyan"><Icon className="h-5 w-5" /></div>
              <h3 className="mb-[9px] text-lg font-extrabold">{index + 1}. {title}</h3>
              <p className="mb-0 leading-[1.65] text-muted">{copy}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function EditorPreviewSection() {
  return (
    <section id="editor" className="section-pad border-y border-soft/15 bg-[#101A2E]">
      <div className="site-container">
        <div className="section-head">
          <h2>A focused editor for subtitle cleanup.</h2>
          <p>Every control is close to the video, transcript, and timeline so teams can fix issues quickly before export.</p>
        </div>
        <div className="overflow-hidden rounded border border-line bg-panel shadow-panel">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-panel-2 p-3">
            <div className="flex gap-2" aria-label="Editing controls">
              {["Undo", "Redo", "Split", "Merge", "Search"].map((tool) => (
                <button key={tool} className="grid h-10 w-10 place-items-center rounded border border-line bg-white/[.03] text-xs font-extrabold text-muted hover:text-text" title={tool}>
                  {tool.slice(0, 1)}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary">Auto-sync</Button>
              <ExportModal trigger={<Button variant="primary">Export SRT</Button>} />
            </div>
          </div>
          <div className="grid gap-0 lg:grid-cols-[1.1fr_.9fr]">
            <div className="p-5">
              <div className="relative grid aspect-video place-items-center overflow-hidden rounded border border-line bg-bg">
                <div className="absolute inset-0 opacity-50 [background:linear-gradient(135deg,rgba(99,102,241,.22),transparent_35%),linear-gradient(45deg,rgba(34,211,238,.14),transparent_45%)]" />
                <button className="relative grid h-[54px] w-[54px] place-items-center rounded-full bg-indigo font-extrabold">▶</button>
                <div className="absolute bottom-6 rounded bg-black/55 px-4 py-2 text-sm font-bold">We can publish localized captions before launch day.</div>
              </div>
              <div className="mt-4 h-12 rounded border border-line bg-panel-2 p-3">
                <div className="flex h-full gap-2">
                  <span className="h-full w-[24%] rounded bg-cyan" />
                  <span className="h-full w-[18%] rounded bg-indigo" />
                  <span className="h-full w-[31%] rounded bg-success" />
                  <span className="h-full flex-1 rounded bg-panel-3" />
                </div>
              </div>
            </div>
            <div className="border-t border-line p-5 lg:border-l lg:border-t-0">
              {[
                ["00:21.2", "We can publish localized captions before launch day."],
                ["00:26.8", "The editor keeps timing, wording, and export settings in one place."],
                ["00:33.4", "Review reading speed and long lines before exporting."],
                ["00:41.0", "Download SRT or VTT when the captions are clean."]
              ].map(([time, text], index) => (
                <div key={time} className={`mb-3 rounded border p-3 ${index === 1 ? "border-cyan bg-cyan/10" : "border-line bg-panel-2"}`}>
                  <div className="mb-1 font-mono text-xs text-cyan">{time}</div>
                  <p className="mb-0 text-sm leading-6 text-muted">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function FeaturesSection() {
  return (
    <section id="features" className="section-pad">
      <div className="site-container">
        <div className="section-head">
          <h2>Everything creators need for subtitle delivery.</h2>
          <p>Accurate generation, practical editing tools, and export controls that match real publishing workflows.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map(([code, title, copy]) => (
            <article key={title} className="panel-card p-[22px]">
              <div className="mb-4 grid h-10 w-10 place-items-center rounded bg-indigo/20 text-xs font-extrabold text-cyan">{code}</div>
              <h3 className="mb-[9px] text-lg font-extrabold">{title}</h3>
              <p className="mb-0 leading-[1.65] text-muted">{copy}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function StatusSection() {
  return (
    <section className="section-pad border-y border-soft/15 bg-[#101A2E]">
      <div className="site-container grid gap-8 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
        <div>
          <span className="eyebrow"><span className="dot" /> Upload status</span>
          <h2 className="mb-4 mt-5 text-[clamp(30px,4vw,44px)] font-extrabold leading-[1.08]">Keep the upload, transcription, and cleanup flow visible.</h2>
          <p className="mb-0 leading-7 text-muted">
            MVP status screens make long media jobs predictable, while recent uploads help creators return to drafts without hunting through files.
          </p>
        </div>
        <UploadStatus />
      </div>
    </section>
  );
}

export function PricingTeaserSection() {
  return (
    <section id="pricing" className="section-pad">
      <div className="site-container">
        <div className="section-head">
          <h2>Simple, transparent pricing.</h2>
          <p>Start with free subtitle exports, then upgrade when burn-in, batch workflows, or team controls matter.</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {[
            ["Starter", "$0", "30 minutes/month", ["No sign-up to edit", "SRT, VTT, TXT export", "Inline editor"]],
            ["Creator", "$9", "10 hours/month", ["Burn-in export", "Style templates", "Batch processing"]],
            ["Business", "$29", "50 hours/month", ["Team seats", "API access", "Brand templates"]]
          ].map(([plan, price, meta, items]) => (
            <article key={plan as string} className={`panel-card p-[22px] ${(plan as string) === "Creator" ? "border-cyan bg-cyan/[.045]" : ""}`}>
              <h3 className="mb-2 text-lg font-extrabold">{plan as string}</h3>
              <div className="mb-1 text-4xl font-extrabold">{price as string}<span className="text-base text-soft">/mo</span></div>
              <p className="mb-5 text-sm text-muted">{meta as string}</p>
              <ul className="mb-6 grid gap-3">
                {(items as string[]).map((item) => (
                  <li key={item} className="flex gap-2 text-sm text-muted"><Check className="h-4 w-4 text-success" />{item}</li>
                ))}
              </ul>
              <Link className="inline-flex min-h-[42px] w-full items-center justify-center rounded border border-line bg-white/[.03] px-4 text-sm font-bold" href="/pricing">
                View plan
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FaqSection() {
  return (
    <section id="faq" className="section-pad">
      <div className="site-container">
        <div className="section-head">
          <h2>Frequently asked questions.</h2>
          <p>Common details about accounts, export formats, transcription quality, and commercial use.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {faqs.map(([q, a]) => (
            <article key={q} className="panel-card p-[22px]">
              <h3 className="mb-[9px] text-lg font-extrabold">{q}</h3>
              <p className="mb-0 leading-[1.65] text-muted">{a}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
