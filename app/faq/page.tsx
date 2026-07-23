import Link from "next/link";
import { Footer } from "@/components/footer";
import { JsonLd } from "@/components/seo/json-ld";
import { SiteNav } from "@/components/site-nav";
import { createPageJsonLd, createPageMetadata } from "@/lib/metadata";

const faqs = [
  ["Do I need to create an account?", "Local upload, preview, and manual editing can start before sign-in. AI transcription, account export, checkout, and paid usage require Google sign-in."],
  ["What formats can I export?", "SRT, VTT, and TXT are available today."],
  ["How accurate is transcription?", "Accuracy is strongest with clear audio, and every line remains editable inline before export."],
  ["Can I use exported subtitles commercially?", "Yes. Everything you export is yours. We do not watermark, claim rights, or review your content."],
  ["What happens to my video after upload?", "Uploaded media is used to run the transcription workflow. A daily retention job deletes uploaded media under uploads/ from R2 after it is older than 7 days. Local editor drafts remain in your browser until you clear them."],
  ["Is there a file size limit?", "User-facing limits are duration based: Free 60 minutes per file, Pro 180, Studio 360. Automatic transcription also has a 25 MB technical payload guard today."],
  ["Can I edit an existing SRT file?", "Yes. You can use the editor workflow to adjust subtitle text and timing, then export clean subtitle files."],
  ["What is the difference between Free and Pro?", "Free includes 60 minutes per month and 60 minutes per file. Pro includes 600 minutes per month and 180 minutes per file."],
  ["Do pay-as-you-go credits expire?", "No. Extra transcription credits are intended to be used whenever you need them."],
  ["What does Studio add?", "Studio increases transcription quota to 3000 minutes per month and 360 minutes per file."],
  ["Do I need permission to process videos?", "Yes. You are responsible for ensuring you have the necessary rights to upload, process, and export any content."]
];

export const metadata = createPageMetadata({
  path: "/faq",
  title: "FAQ",
  description: "Answers to common questions about VideoToSRT accounts, subtitle exports, transcription, privacy, pricing, and content permissions."
});

const pageJsonLd = createPageJsonLd({
  path: "/faq",
  name: "FAQ",
  description: "Answers to common questions about VideoToSRT accounts, subtitle exports, transcription, privacy, pricing, and content permissions.",
  extraNodes: [
    {
      "@type": "FAQPage",
      mainEntity: faqs.map(([question, answer]) => ({
        "@type": "Question",
        name: question,
        acceptedAnswer: {
          "@type": "Answer",
          text: answer
        }
      }))
    }
  ]
});

export default function FaqPage() {
  return (
    <>
      <JsonLd data={pageJsonLd} />
      <SiteNav active="faq" />
      <main>
        <header className="border-b border-soft/15 py-[72px]">
          <div className="site-container">
            <span className="eyebrow"><span className="dot" /> Help Center</span>
            <h1 className="mb-4 mt-5 max-w-[760px] text-[clamp(42px,6vw,68px)] font-extrabold leading-[1]">Frequently Asked Questions</h1>
            <p className="mb-0 max-w-[720px] text-lg leading-[1.7] text-muted">
              Quick answers about uploading media, generating subtitles, exporting files, and managing paid usage.
            </p>
          </div>
        </header>

        <section className="section-pad">
          <div className="site-container grid gap-4 md:grid-cols-2">
            {faqs.map(([question, answer]) => (
              <article key={question} className="panel-card p-[22px]">
                <h2 className="mb-3 text-lg font-extrabold">{question}</h2>
                <p className="mb-0 leading-[1.65] text-muted">{answer}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-t border-soft/15 py-14">
          <div className="site-container flex flex-wrap items-center justify-between gap-5">
            <div>
              <h2 className="mb-2 text-2xl font-extrabold">Still need help?</h2>
              <p className="mb-0 text-muted">Send a short note and include the page, browser, and account email if it is about billing or login.</p>
            </div>
            <Link className="inline-flex min-h-[42px] items-center justify-center rounded bg-indigo px-4 text-sm font-bold text-text shadow-[0_12px_30px_rgba(99,102,241,.22)] transition hover:-translate-y-px" href="/contact">
              Contact Support
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
