import type { Metadata } from "next";
import { Footer } from "@/components/footer";
import { SiteNav } from "@/components/site-nav";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of Service for VideoToSRT subtitle generation, editing, exports, plans, and account usage.",
  alternates: { canonical: "/terms-of-service" }
};

export default function TermsOfServicePage() {
  return (
    <>
      <SiteNav />
      <main className="site-container py-16">
        <article className="mx-auto max-w-3xl">
          <span className="eyebrow"><span className="dot" /> Legal</span>
          <h1 className="mb-5 mt-5 text-[clamp(38px,6vw,60px)] font-extrabold leading-none">Terms of Service</h1>
          <p className="text-muted">Last updated: May 31, 2026</p>
          {[
            ["Use of service", "VideoToSRT provides browser-based subtitle generation, editing, and export workflows. You are responsible for the media you upload and the rights needed to process it."],
            ["Accounts and exports", "You may upload and edit before signing in. Export, billing, and saved project features may require an account."],
            ["Plans and limits", "Free and paid limits are described on the pricing page. Usage limits, supported formats, and feature availability may change as the MVP evolves."],
            ["Content ownership", "You retain ownership of uploaded media and exported subtitles. You grant VideoToSRT the limited rights required to process, store, and deliver your projects."],
            ["Prohibited use", "Do not use the service for unlawful content, rights infringement, malware, abuse of infrastructure, or attempts to bypass usage limits."],
            ["Support", "Service questions can be sent to support@videotosrt.org."]
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
