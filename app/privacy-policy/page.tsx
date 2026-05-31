import type { Metadata } from "next";
import { Footer } from "@/components/footer";
import { SiteNav } from "@/components/site-nav";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for VideoToSRT, including uploaded media, account data, exports, and support contact.",
  alternates: { canonical: "/privacy-policy" }
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <SiteNav />
      <main className="site-container py-16">
        <article className="mx-auto max-w-3xl">
          <span className="eyebrow"><span className="dot" /> Legal</span>
          <h1 className="mb-5 mt-5 text-[clamp(38px,6vw,60px)] font-extrabold leading-none">Privacy Policy</h1>
          <p className="text-muted">Last updated: May 31, 2026</p>
          {[
            ["What we collect", "We collect account details you provide, uploaded media, generated transcripts, subtitle edits, export settings, and basic operational logs needed to run VideoToSRT."],
            ["How we use data", "We use data to process uploads, generate subtitles, save drafts, manage usage limits, provide support, prevent abuse, and improve reliability."],
            ["Anonymous projects", "The product is designed for upload and editing before sign-in. Anonymous session data may be retained temporarily so you can complete the workflow."],
            ["Media retention", "MVP project media and anonymous session data are intended for short-lived processing and cleanup. Paid account retention settings may vary by plan."],
            ["Third-party services", "VideoToSRT may use infrastructure, transcription, storage, authentication, payment, and email providers to deliver the service. Analytics are not configured unless IDs are provided."],
            ["Contact", "Questions or deletion requests can be sent to support@videotosrt.org."]
          ].map(([title, body]) => (
            <section key={title} className="border-b border-line py-7">
              <h2 className="mb-3 text-2xl font-extrabold">{title}</h2>
              <p className="mb-0 leading-7 text-muted">{body}</p>
            </section>
          ))}
        </article>
      </main>
      <Footer />
    </>
  );
}
