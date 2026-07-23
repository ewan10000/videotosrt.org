"use client";

import Link from "next/link";
import { useId, type DragEvent } from "react";
import type { LucideIcon } from "lucide-react";
import * as Collapsible from "@radix-ui/react-collapsible";
import { ArrowDown, Check, ChevronDown, Scissors, Upload } from "lucide-react";
import { HomeUploadButton, useHomeUploadPicker } from "@/components/home-upload-button";
import { ExportModal } from "@/components/modals/export-modal";
import { Button } from "@/components/ui/button";
import { UploadStatus } from "@/components/upload-status";

const features = [
  ["ED", "Inline Editor", "Edit text and timestamps directly. No external tools, no format juggling."],
  ["SRT", "Subtitle Export", "Download SRT, VTT, or TXT after cleanup."],
  ["60", "Free Minutes", "Free accounts include 60 transcription minutes per month and up to 60 minutes per file."],
  ["AI", "AI Transcription", "Generate an editable draft after Google sign-in, then review every line."],
  ["180", "Per-file Duration", "Plan limits are duration based: Free 60, Pro 180, and Studio 360 minutes per file."],
  ["1 GB", "Technical Limit", "AI transcription currently has a 1 GB technical file-size limit in addition to minute quotas."]
];

const faqs = [
  ["Do I need to create an account?", "You can start local upload, preview, and manual editing without an account. AI transcription, account export, checkout, and paid usage require Google sign-in."],
  ["What formats can I export?", "SRT, VTT, and TXT are available today."],
  ["How accurate is transcription?", "Accuracy depends on audio quality, speakers, background noise, and vocabulary. Every line is editable inline before export."],
  ["Can I use exported subtitles commercially?", "Yes. Everything you export is yours. We don't watermark, we don't claim rights, we don't look at your content."],
  ["What happens to my video after upload?", "Uploaded media is used to run the transcription workflow. A daily retention job deletes uploaded media under uploads/ from R2 after it is older than 7 days. Local editor drafts remain in your browser until you clear them."],
  ["Is there a file size limit?", "Plan limits are duration based: Free 60 minutes per file, Pro 180, Studio 360. Automatic transcription also has a 1 GB technical file-size limit today."],
  ["Can I edit an existing SRT file?", "Yes. Upload your SRT alongside the video, or paste it directly into the editor. Fix timing without touching code."],
  ["What's the difference between Free and Pro?", "Free includes 60 transcription minutes per month and 60 minutes per file. Pro includes 600 minutes per month and 180 minutes per file."],
  ["Does the pay-as-you-go credit expire?", "Never. Buy once, use whenever. No monthly pressure."],
  ["What does Studio add?", "Studio increases transcription quota to 3000 minutes per month and 360 minutes per file."],
  ["Do I need permission to process videos?", "Yes. VideoToSRT is a subtitle editing tool. You are solely responsible for ensuring you have the necessary rights to upload, process, and export any content. We comply with DMCA and will respond to valid takedown notices."]
];

const useCases = [
  ["Short-form clips", "Create SRT, VTT, or TXT for clips after AI transcription and inline cleanup."],
  ["Course captions", "Prepare readable subtitles for lessons, tutorials, and internal training videos."],
  ["Podcast video", "Turn recorded conversations into editable subtitle drafts for review before publishing."],
  ["Existing SRT cleanup", "Load subtitle files alongside media and adjust wording or timing in one editor."]
];

const toolLinks = [
  ["/video-to-srt", "Convert video to SRT"],
  ["/audio-to-srt", "Convert audio to SRT"],
  ["/mp4-to-srt", "Convert MP4 to SRT"],
  ["/video-to-text", "Convert video to text"],
  ["/audio-to-text", "Convert audio to text"],
  ["/video-to-vtt", "Convert video to VTT"],
  ["/srt-editor", "Open the SRT editor"]
];

export function HeroSection() {
  return (
    <header className="border-b border-soft/15 py-[72px] pb-11">
      <div className="site-container grid items-center gap-[42px] lg:grid-cols-[minmax(0,.92fr)_minmax(430px,1.08fr)]">
        <div>
          <span className="eyebrow"><span className="dot" /> Browser subtitle editing with Google sign-in for account features</span>
          <h1 className="mb-[18px] mt-5 max-w-[780px] text-[clamp(42px,6vw,72px)] font-extrabold leading-[.98]">
            Turn Video Into Editable Subtitles
          </h1>
          <p className="mb-7 mt-[22px] max-w-[660px] text-lg leading-[1.7] text-muted">
            Upload your media, generate an AI transcript, edit text and timing inline, and export SRT, VTT, or TXT. Free includes 60 minutes per month and 60 minutes per file; Google sign-in is required for AI transcription, account export, checkout, and paid usage.
          </p>
          <div className="mb-[30px] flex flex-wrap gap-3">
            <HomeUploadButton className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded bg-indigo px-4 text-sm font-bold text-white shadow-[0_4px_14px_rgba(99,102,241,.3)] transition hover:-translate-y-px" />
            <Link className="inline-flex min-h-[42px] items-center justify-center rounded border border-indigo-300/30 bg-transparent px-4 text-sm font-bold text-indigo-300 transition hover:-translate-y-px hover:border-indigo-300/50 hover:text-indigo-200" href="#editor">
              View editor
            </Link>
          </div>
          <div className="grid max-w-[620px] grid-cols-1 gap-3 sm:grid-cols-3" aria-label="Product metrics">
            {["Local edit can start before sign-in", "Google sign-in for account features", "No watermark"].map((metric, index) => (
              <div key={metric} className="rounded border border-line bg-white/[.025] p-[15px]">
                <strong className="mb-1 block text-[22px]">{index === 0 ? "Local" : index === 1 ? "Google" : "0"}</strong>
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
  const { handleFileChange, inputRef, openFilePicker, startUpload } = useHomeUploadPicker();
  const inputId = useId();

  const handleDragOver = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
  };

  const handleDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];

    if (file) {
      void startUpload(file);
    }
  };

  return (
    <div id="upload" className="overflow-hidden rounded border border-line bg-panel shadow-panel">
      <div className="window-bar">
        <div className="traffic" aria-hidden="true"><span /><span /><span /></div>
        <div className="text-[13px] font-bold text-soft">New subtitle project</div>
      </div>
      <div className="p-[28px]">
        <input
          id={inputId}
          ref={inputRef}
          className="peer sr-only"
          tabIndex={-1}
          type="file"
          aria-label="Upload video or audio file"
          accept="video/*,audio/*"
          onChange={handleFileChange}
        />
        <label
          className="grid min-h-[380px] cursor-pointer place-items-center rounded border border-dashed border-cyan/60 bg-cyan/[.045] p-6 text-center transition hover:border-cyan hover:bg-cyan/[.07] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-cyan"
          htmlFor={inputId}
          tabIndex={0}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openFilePicker();
            }
          }}
        >
          <div>
            <div className="mx-auto mb-[18px] grid h-[58px] w-[58px] place-items-center rounded bg-indigo text-[28px] font-extrabold text-white">
              <Upload className="h-7 w-7" />
            </div>
            <h2 className="mb-[9px] text-2xl font-extrabold leading-[1.2]">Drop your video here</h2>
            <p className="mx-auto mb-5 max-w-[410px] leading-[1.6] text-muted">
              Drag in a local MP4, MOV, WebM, MP3, M4A, or WAV file. AI transcription requires Google sign-in and has a 1 GB technical file-size limit; minute quotas still apply by plan.
            </p>
          </div>
        </label>
      </div>
    </div>
  );
}

export function WorkflowSection() {
  const steps: Array<{ icon: LucideIcon; title: string; copy: string }> = [
    { icon: Upload, title: "Upload", copy: "Drag in a video or audio file. You are responsible for ensuring you have the right to process any content." },
    { icon: Scissors, title: "Edit", copy: "Click any line to fix text. Click timestamps to nudge timing. The video preview syncs as you work." },
    { icon: ArrowDown, title: "Export", copy: "Download SRT, VTT, or TXT after cleanup. Your file, your rights." }
  ];
  return (
    <section id="workflow" className="section-pad">
      <div className="site-container">
        <div className="section-head">
          <h2>From Upload to Export in Three Clicks</h2>
          <p>Built for creators who ship.</p>
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

export function ToolsDiscoverySection() {
  return (
    <section className="section-pad">
      <div className="site-container">
        <div className="section-head">
          <h2>Subtitle Tools</h2>
          <p>Direct paths for the local upload, AI transcription, edit, and export workflows available today.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {toolLinks.map(([href, label]) => (
            <Link key={href} className="panel-card p-4 text-sm font-extrabold text-soft transition hover:-translate-y-px hover:border-cyan hover:text-text" href={href}>
              {label}
            </Link>
          ))}
          <Link className="panel-card p-4 text-sm font-extrabold text-cyan transition hover:-translate-y-px hover:border-cyan" href="/tools">
            View all available tools
          </Link>
        </div>
      </div>
    </section>
  );
}

export function SampleProofSection() {
  const samples = {
    SRT: "1\n00:00:00,000 --> 00:00:03,200\nWelcome to the product walkthrough.\n\n2\n00:00:03,200 --> 00:00:06,400\nEdit any line before exporting.",
    VTT: "WEBVTT\n\n00:00:00.000 --> 00:00:03.200\nWelcome to the product walkthrough.\n\n00:00:03.200 --> 00:00:06.400\nEdit any line before exporting.",
    TXT: "[00:00:00.000 - 00:00:03.200]\nWelcome to the product walkthrough.\n\n[00:00:03.200 - 00:00:06.400]\nEdit any line before exporting."
  };

  return (
    <section className="section-pad border-y border-soft/15 bg-[#101A2E]">
      <div className="site-container grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
        <div>
          <span className="eyebrow"><span className="dot" /> Product proof</span>
          <h2 className="mb-4 mt-5 text-[clamp(30px,4vw,44px)] font-extrabold leading-[1.08]">Transparent Export Preview</h2>
          <p className="mb-0 leading-7 text-muted">
            The editor creates plain subtitle and transcript files you can inspect. Review AI text and timing before downloading SRT, VTT, or TXT.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {Object.entries(samples).map(([format, body]) => (
            <article key={format} className="rounded border border-line bg-panel p-4">
              <h3 className="mb-3 text-sm font-extrabold text-cyan">{format}</h3>
              <pre className="mb-0 overflow-auto whitespace-pre-wrap rounded border border-line bg-bg p-3 font-mono text-[11px] leading-5 text-soft">{body}</pre>
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
          <h2>A Focused Editor for Subtitle Cleanup</h2>
          <p>Everything you need. Nothing you don't. No tabs to hunt through.</p>
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
                <div className="absolute bottom-6 rounded bg-black/55 px-4 py-2 text-sm font-bold">Fix a typo in two seconds.</div>
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
                ["00:21.2", "Fix a typo in two seconds."],
                ["00:26.8", "Nudge timing without leaving the keyboard."],
                ["00:33.4", "Catch long lines before they break your layout."],
                ["00:41.0", "Export when it feels right."]
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
          <h2>Everything You Need. Nothing You Don't.</h2>
          <p>No bloat. No learning curve. Just the tools that get subtitles out the door.</p>
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
          <h2 className="mb-4 mt-5 text-[clamp(30px,4vw,44px)] font-extrabold leading-[1.08]">Keep Your Workflow Visible</h2>
          <p className="mb-0 leading-7 text-muted">
            See transcription progress. Jump back to recent drafts. No hunting through folders.
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
          <h2>Simple Pricing. No Surprises.</h2>
          <p>Start free. Upgrade when volume grows.</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {[
            ["Free", "$0", "60 min/mo", ["60 min/file", "SRT, VTT, TXT export", "Inline editor"], "Start Free"],
            ["Pro", "$9.90", "600 min/mo", ["180 min/file", "SRT, VTT, TXT export", "Inline editor"], "Start Pro"],
            ["Studio", "$29.90", "3000 min/mo", ["360 min/file", "SRT, VTT, TXT export", "Inline editor"], "Start Studio"]
          ].map(([plan, price, meta, items, cta]) => (
            <article key={plan as string} className={`panel-card p-[22px] ${(plan as string) === "Pro" ? "border-cyan bg-cyan/[.045]" : ""}`}>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="mb-0 text-lg font-extrabold">{plan as string}</h3>
                {(plan as string) === "Pro" ? <span className="rounded bg-cyan/10 px-3 py-1 text-xs font-extrabold text-cyan">Popular</span> : null}
              </div>
              <div className="mb-1 text-4xl font-extrabold">{price as string}<span className="text-base text-soft">/mo</span></div>
              <p className="mb-5 text-sm text-muted">{meta as string}</p>
              <ul className="mb-6 grid gap-3">
                {(items as string[]).map((item) => (
                  <li key={item} className="flex gap-2 text-sm text-muted"><Check className="h-4 w-4 text-success" />{item}</li>
                ))}
              </ul>
              <Link className="inline-flex min-h-[42px] w-full items-center justify-center rounded border border-line bg-white/[.03] px-4 text-sm font-bold" href="/pricing">
                {cta as string}
              </Link>
            </article>
          ))}
        </div>
        <p className="mb-0 mt-5 text-center text-sm font-semibold text-soft">
          All plans: No watermark · Google sign-in for AI transcription · PayPal checkout · You own your exports
        </p>
      </div>
    </section>
  );
}

export function UseCasesSection() {
  return (
    <section className="section-pad">
      <div className="site-container">
        <div className="section-head">
          <h2>Common Workflows</h2>
          <p>Subtitle tasks the editor is designed to support.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {useCases.map(([workflow, copy]) => (
            <article key={workflow} className="panel-card p-[22px]">
              <h3 className="mb-[9px] text-lg font-extrabold">{workflow}</h3>
              <p className="mb-0 leading-[1.65] text-muted">{copy}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalCtaSection() {
  return (
    <section className="section-pad border-y border-soft/15 bg-[#101A2E]">
      <div className="site-container text-center">
        <h2 className="mb-4 text-[clamp(30px,4vw,44px)] font-extrabold leading-[1.08]">Stop Wrestling with Subtitles</h2>
        <p className="mx-auto mb-7 max-w-[760px] text-lg leading-[1.7] text-muted">
          Upload media, generate a transcript when it fits current limits, edit every line, and export SRT, VTT, or TXT.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link className="inline-flex min-h-[42px] items-center justify-center rounded bg-indigo px-4 text-sm font-bold text-text shadow-[0_12px_30px_rgba(99,102,241,.22)] transition hover:-translate-y-px" href="/#upload">
            Start free upload - 1 GB AI limit
          </Link>
          <Link className="inline-flex min-h-[42px] items-center justify-center rounded border border-line bg-white/[.03] px-4 text-sm font-bold text-text transition hover:-translate-y-px" href="/pricing">
            See Pricing
          </Link>
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
          <h2>Frequently Asked Questions</h2>
          <p>The stuff you'd ask before committing.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {faqs.map(([q, a]) => (
            <FAQItem key={q} question={q} answer={a} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  return (
    <Collapsible.Root className="panel-card group overflow-hidden">
      <Collapsible.Trigger className="flex w-full items-center justify-between gap-4 p-[22px] text-left">
        <h3 className="mb-0 text-lg font-extrabold">{question}</h3>
        <ChevronDown className="h-5 w-5 shrink-0 text-cyan transition-transform duration-200 group-data-[state=open]:rotate-180" />
      </Collapsible.Trigger>
      <Collapsible.Content className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
        <p className="mb-0 px-[22px] pb-[22px] leading-[1.65] text-muted">{answer}</p>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}
