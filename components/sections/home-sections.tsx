"use client";

import Link from "next/link";
import type { DragEvent } from "react";
import type { LucideIcon } from "lucide-react";
import * as Collapsible from "@radix-ui/react-collapsible";
import { ArrowDown, Check, ChevronDown, Scissors, Upload } from "lucide-react";
import { HomeUploadButton, useHomeUploadPicker } from "@/components/home-upload-button";
import { ExportModal } from "@/components/modals/export-modal";
import { Button } from "@/components/ui/button";
import { UploadStatus } from "@/components/upload-status";

const features = [
  ["ED", "Inline Editor", "Edit text and timestamps directly. No external tools, no format juggling."],
  ["ST", "Style Export", "ASS/SSA with fonts, colors, positioning. Studio-grade output from a browser."],
  ["MP4", "Burn-in Preview", "Preview hardcoded subtitles before MP4 export. Full burn-in export is coming soon."],
  ["50+", "50+ Languages", "Auto-detect or manually set. Whisper-powered, edit-friendly accuracy."],
  ["20", "Batch Process", "Drop 20 files at once. Let it run, come back when it's done."],
  ["URL", "URL Import", "Paste a public video URL to import directly. Supports major platforms. No download-upload loop. You must have permission to process the content."]
];

const faqs = [
  ["Do I need to create an account?", "No. Upload and edit immediately. We only ask for your email when you hit Export — so we can send you the file."],
  ["What formats can I export?", "SRT, VTT, and TXT are available today. ASS/SSA styled export and MP4 burn-in export are coming soon for paid plans."],
  ["How accurate is transcription?", "Powered by Whisper. 95%+ for clear audio. Every line is editable inline, so perfect accuracy is one click away."],
  ["Can I use exported subtitles commercially?", "Yes. Everything you export is yours. We don't watermark, we don't claim rights, we don't look at your content."],
  ["What happens to my video after upload?", "Processed and deleted automatically. We don't store your original video or your subtitles longer than necessary. Anonymous projects expire in 7 days."],
  ["Is there a file size limit?", "2GB per file for uploads. URL imports have no size limit — we handle the heavy lifting."],
  ["Can I edit an existing SRT file?", "Yes. Upload your SRT alongside the video, or paste it directly into the editor. Fix timing without touching code."],
  ["What's the difference between Free and Pro?", "Free gives you 60 minutes a month and basic formats. Pro adds burn-in preview, style templates, and 10 hours — enough for a weekly creator."],
  ["Does the pay-as-you-go credit expire?", "Never. Buy once, use whenever. No monthly pressure."],
  ["Can my team share templates and projects?", "Studio plan supports 3 team members with shared brand templates and cloud history. Need more seats? Contact us."],
  ["Do I need permission to process videos?", "Yes. VideoToSRT is a subtitle editing tool. You are solely responsible for ensuring you have the necessary rights to upload, process, and export any content. We comply with DMCA and will respond to valid takedown notices."]
];

const useCases = [
  ["John · Content Creator", "Used to juggle between apps to get a clip done. Now it's one straight line—saves me a lot of hassle."],
  ["Sarah · Educator", "Showing videos with subtitles to my class. Attention span's noticeably different."],
  ["Mike · Podcast Producer", "Audio comes out cleaner than my previous tool. One less round of noise reduction in post."],
  ["Lisa · Short-form Creator", "Templates are straightforward. First try got me a video that actually performed."]
];

export function HeroSection() {
  return (
    <header className="border-b border-soft/15 py-[72px] pb-11">
      <div className="site-container grid items-center gap-[42px] lg:grid-cols-[minmax(0,.92fr)_minmax(430px,1.08fr)]">
        <div>
          <span className="eyebrow"><span className="dot" /> Forge Perfect Subtitles. No Software. No Sign-Up.</span>
          <h1 className="mb-[18px] mt-5 max-w-[780px] text-[clamp(42px,6vw,72px)] font-extrabold leading-[.98]">
            Turn Any Video Into Accurate Subtitles in 60 Seconds
          </h1>
          <p className="mb-7 mt-[22px] max-w-[660px] text-lg leading-[1.7] text-muted">
            Upload your video. Our AI transcribes in 50+ languages. You edit inline, fix timing, and export SRT/VTT/TXT — all in your browser. Done in 60 seconds.
          </p>
          <div className="mb-[30px] flex flex-wrap gap-3">
            <HomeUploadButton className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded bg-indigo px-4 text-sm font-bold text-white shadow-[0_4px_14px_rgba(99,102,241,.3)] transition hover:-translate-y-px" />
            <Link className="inline-flex min-h-[42px] items-center justify-center rounded border border-indigo-300/30 bg-transparent px-4 text-sm font-bold text-indigo-300 transition hover:-translate-y-px hover:border-indigo-300/50 hover:text-indigo-200" href="#editor">
              View editor
            </Link>
          </div>
          <div className="grid max-w-[620px] grid-cols-1 gap-3 sm:grid-cols-3" aria-label="Product metrics">
            {["No sign-up to edit", "Export with email", "No watermark"].map((metric, index) => (
              <div key={metric} className="rounded border border-line bg-white/[.025] p-[15px]">
                <strong className="mb-1 block text-[22px]">{index === 0 ? "0" : index === 1 ? "Email" : "0"}</strong>
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
        <div
          className="grid min-h-[380px] cursor-pointer place-items-center rounded border border-dashed border-cyan/60 bg-cyan/[.045] p-6 text-center transition hover:border-cyan hover:bg-cyan/[.07]"
          role="button"
          tabIndex={0}
          onClick={openFilePicker}
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
              Drag in your video or paste a link. AI handles the rest.
            </p>
            <input
              ref={inputRef}
              className="sr-only"
              type="file"
              accept="video/*,audio/*"
              onChange={handleFileChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function WorkflowSection() {
  const steps: Array<{ icon: LucideIcon; title: string; copy: string }> = [
    { icon: Upload, title: "Upload", copy: "Drag in your video or paste a public URL. AI auto-detects language and transcribes while you grab coffee. You are responsible for ensuring you have the right to process any content." },
    { icon: Scissors, title: "Edit", copy: "Click any line to fix text. Click timestamps to nudge timing. The video preview syncs as you work." },
    { icon: ArrowDown, title: "Export", copy: "Download SRT, VTT, or TXT. Burn-in coming soon. Your file, your rights, zero hassle." }
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
            ["Free", "$0", "60 min/mo", ["No sign-up to edit", "SRT, VTT, TXT export", "Inline editor"], "Start Free"],
            ["Pro", "$9.90", "10 hrs/mo", ["Burn-in preview", "20 style templates", "Batch 20 files"], "Start Pro"],
            ["Studio", "$29.90", "50 hrs/mo", ["Team (3 seats)", "API access", "Brand templates"], "Start Studio"]
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
          All plans: No watermark · 50+ languages · Secure processing · You own your exports
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
          <h2>Early User Feedback</h2>
          <p>Feedback from friends and industry contacts who tested the product before launch. All based on actual use.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {useCases.map(([role, quote]) => (
            <article key={role} className="panel-card p-[22px]">
              <h3 className="mb-[9px] text-lg font-extrabold">{role}</h3>
              <p className="mb-0 leading-[1.65] text-muted">"{quote}"</p>
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
          Your video is ready. Your audience is waiting. Upload now and get clean subtitles in 60 seconds — no software, no credit card, no excuses.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link className="inline-flex min-h-[42px] items-center justify-center rounded bg-indigo px-4 text-sm font-bold text-text shadow-[0_12px_30px_rgba(99,102,241,.22)] transition hover:-translate-y-px" href="/#upload">
            Start Free — Upload Video
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
      <Collapsible.Content forceMount className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
        <p className="mb-0 px-[22px] pb-[22px] leading-[1.65] text-muted">{answer}</p>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}
