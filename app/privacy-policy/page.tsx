import { Footer } from "@/components/footer";
import { createPageJsonLd, createPageMetadata } from "@/lib/metadata";
import { JsonLd } from "@/components/seo/json-ld";
import { SiteNav } from "@/components/site-nav";

export const metadata = createPageMetadata({
  path: "/privacy-policy",
  title: "Privacy Policy",
  description: "Privacy Policy for VideoToSRT, including uploaded media, account data, exports, and support contact."
});
const pageJsonLd = createPageJsonLd({
  path: "/privacy-policy",
  name: "Privacy Policy",
  description: "Privacy Policy for VideoToSRT, including uploaded media, account data, exports, and support contact."
});


export default function PrivacyPolicyPage() {
  const lastUpdated = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <>
      <JsonLd data={pageJsonLd} />
      <SiteNav />
      <main className="site-container py-16">
        <article className="mx-auto max-w-3xl">
          <span className="eyebrow"><span className="dot" /> Legal</span>
          <h1 className="mb-5 mt-5 text-[clamp(38px,6vw,60px)] font-extrabold leading-none">Privacy Policy</h1>
          <p className="text-muted">Last updated: {lastUpdated}</p>
          {[
            ["What we collect", "We collect account details you provide, uploaded media, generated transcripts, subtitle edits, export settings, and basic operational logs needed to run VideoToSRT."],
            ["How we use data", "We use data to process uploads, generate subtitles, save drafts, manage usage limits, provide support, prevent abuse, and improve reliability."],
            ["Anonymous projects", "The product is designed for upload and editing before sign-in. Anonymous session data may be retained temporarily so you can complete the workflow."],
            ["Product analytics", "VideoToSRT stores a persistent anonymous browser ID in localStorage to count product events such as page views, uploads, transcription status, export starts, download initiation, checkout intent, and checkout status. Event details are limited to the page path, referrer host, event name, anonymous browser ID, and allowlisted fields such as plan, billing period, file type, rounded file size, duration, row count, status, reason, source, and export format. Detailed product events are retained for 30 days; daily aggregate event counts may be retained longer."],
            ["Media retention", "Uploaded media is used for the transcription workflow. A daily retention job deletes uploaded media under uploads/ from R2 after it is older than 7 days. Local drafts remain in your browser until you clear them."],
            ["Third-party services", "VideoToSRT uses Google for sign-in, PayPal for checkout, and Cloudflare infrastructure for the web app and database storage used by this frontend."],
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
