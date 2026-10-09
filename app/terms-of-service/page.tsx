import { Footer } from "@/components/footer";
import { createPageJsonLd, createPageMetadata } from "@/lib/metadata";
import { JsonLd } from "@/components/seo/json-ld";
import { SiteNav } from "@/components/site-nav";

export const metadata = createPageMetadata({
  path: "/terms-of-service",
  title: "Terms of Service",
  description: "Terms of Service for VideoToSRT subtitle generation, editing, exports, plans, and account usage."
});
const pageJsonLd = createPageJsonLd({
  path: "/terms-of-service",
  name: "Terms of Service",
  description: "Terms of Service for VideoToSRT subtitle generation, editing, exports, plans, and account usage."
});


export default function TermsOfServicePage() {
  const lastUpdated = "October 8, 2026";

  return (
    <>
      <JsonLd data={pageJsonLd} />
      <SiteNav />
      <main className="site-container py-16">
        <article className="mx-auto max-w-3xl">
          <span className="eyebrow"><span className="dot" /> Legal</span>
          <h1 className="mb-5 mt-5 text-[clamp(38px,6vw,60px)] font-extrabold leading-none">Terms of Service</h1>
          <p className="text-muted">Last updated: {lastUpdated}</p>
          {[
            ["Use of service", "VideoToSRT provides browser-based subtitle generation, editing, and export workflows. You are responsible for the media you upload and the rights needed to process it."],
            ["Accounts and exports", "You may upload, preview, and manually edit before signing in. AI transcription, account export, checkout, paid usage, billing, and saved account features require Google sign-in."],
            ["Plans and limits", "Free and paid limits are described on the pricing page. Usage limits, supported formats, and feature availability may change as the service changes."],
            ["Subscription billing", "Stripe subscriptions renew automatically at the monthly or annual price selected in checkout until canceled. Annual billing provides a monthly transcription allowance, not a single annual pool. Plan allowances reset each UTC calendar month. One-time extra-minute purchases do not create a subscription."],
            ["Cancellation and refunds", "New subscriptions and one-time credit purchases are processed through Stripe. Use Manage billing to cancel a Stripe subscription at the end of its paid period. Paid access is suspended if payment becomes overdue. Extra minutes apply to the UTC calendar month in which payment is confirmed and expire at month end. Legacy subscriptions remain with their original provider; contact support before migrating. Stripe Managed Payments acts as merchant of record for new purchases, handles applicable taxes and transaction support through Link, and may issue refunds under its policies and applicable consumer rights. Displayed prices are USD base prices; taxes and local currency conversion are shown before payment. Some customer countries are unsupported."],
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
