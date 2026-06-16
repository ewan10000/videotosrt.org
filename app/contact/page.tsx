import Link from "next/link";
import { Footer } from "@/components/footer";
import { JsonLd } from "@/components/seo/json-ld";
import { SiteNav } from "@/components/site-nav";
import { createPageJsonLd, createPageMetadata } from "@/lib/metadata";

const supportEmail = "support@videotosrt.org";

const supportTopics = [
  ["Login issues", "Tell us which provider you used, the page you returned to, and any visible error message."],
  ["Transcription problems", "Include the file type, approximate duration, and the status message shown in the editor."],
  ["Billing or credits", "Include your account email and whether the purchase was a subscription or extra credit package."],
  ["Copyright or abuse", "Send the affected URL, a short explanation, and any required DMCA details."]
];

export const metadata = createPageMetadata({
  path: "/contact",
  title: "Contact Support",
  description: "Contact VideoToSRT support for login, transcription, billing, copyright, and product questions."
});

const pageJsonLd = createPageJsonLd({
  path: "/contact",
  name: "Contact Support",
  description: "Contact VideoToSRT support for login, transcription, billing, copyright, and product questions.",
  extraNodes: [
    {
      "@type": "ContactPage",
      name: "Contact VideoToSRT Support",
      url: "https://videotosrt.org/contact",
      email: supportEmail
    }
  ]
});

export default function ContactPage() {
  return (
    <>
      <JsonLd data={pageJsonLd} />
      <SiteNav active="contact" />
      <main>
        <header className="border-b border-soft/15 py-[72px]">
          <div className="site-container">
            <span className="eyebrow"><span className="dot" /> Support</span>
            <h1 className="mb-4 mt-5 max-w-[760px] text-[clamp(42px,6vw,68px)] font-extrabold leading-[1]">Contact VideoToSRT</h1>
            <p className="mb-0 max-w-[720px] text-lg leading-[1.7] text-muted">
              Get help with accounts, transcription, exports, billing, copyright requests, or product feedback.
            </p>
          </div>
        </header>

        <section className="section-pad">
          <div className="site-container grid gap-8 lg:grid-cols-[minmax(0,.9fr)_minmax(360px,.55fr)]">
            <div className="grid gap-4 sm:grid-cols-2">
              {supportTopics.map(([title, description]) => (
                <article key={title} className="panel-card p-[22px]">
                  <h2 className="mb-3 text-xl font-extrabold">{title}</h2>
                  <p className="mb-0 leading-[1.65] text-muted">{description}</p>
                </article>
              ))}
            </div>

            <aside className="rounded border border-line bg-panel p-[22px]">
              <h2 className="mb-3 text-2xl font-extrabold">Email support</h2>
              <p className="leading-[1.65] text-muted">
                Send your message to the support inbox. For account-specific requests, use the same email you use to sign in.
              </p>
              <a className="mt-3 inline-flex min-h-[42px] items-center justify-center rounded bg-indigo px-4 text-sm font-bold text-text shadow-[0_12px_30px_rgba(99,102,241,.22)] transition hover:-translate-y-px" href={`mailto:${supportEmail}`}>
                {supportEmail}
              </a>
              <div className="mt-6 border-t border-line pt-5">
                <h3 className="mb-2 text-lg font-extrabold">Before you send</h3>
                <p className="mb-0 leading-[1.65] text-muted">
                  The <Link className="font-semibold text-cyan" href="/faq">FAQ</Link> covers the most common upload, export, and billing questions.
                </p>
              </div>
            </aside>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
