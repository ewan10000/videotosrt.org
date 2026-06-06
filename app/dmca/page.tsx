import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/footer";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { SiteNav } from "@/components/site-nav";

export const metadata: Metadata = {
  title: "DMCA Takedown Policy",
  description: "DMCA takedown policy for VideoToSRT, including infringement notices, counter-notifications, and repeat infringer rules.",
  alternates: { canonical: "/dmca" }
};

export default function DmcaPage() {
  const lastUpdated = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <>
      <SiteNav />
      <Breadcrumbs items={[{ label: "DMCA", href: "/dmca" }]} />
      <main className="site-container py-16">
        <article className="mx-auto max-w-3xl">
          <span className="eyebrow"><span className="dot" /> Legal</span>
          <h1 className="mb-5 mt-5 text-[clamp(38px,6vw,60px)] font-extrabold leading-none">DMCA Takedown Policy</h1>
          <p className="text-muted">Last updated: {lastUpdated}</p>

          <section className="border-b border-line py-7">
            <h2 className="mb-3 text-2xl font-extrabold">Reporting copyright infringement</h2>
            <p className="mb-0 leading-7 text-muted">
              VideoToSRT respects copyright law and responds to notices of alleged infringement under the Digital Millennium Copyright Act.
              To report infringing content, send a DMCA notice to{" "}
              <a className="font-semibold text-cyan" href="mailto:support@videotosrt.org">support@videotosrt.org</a>.
            </p>
          </section>

          <section className="border-b border-line py-7">
            <h2 className="mb-3 text-2xl font-extrabold">Required notice information</h2>
            <p className="leading-7 text-muted">Your notice should include all of the following:</p>
            <ul className="mb-0 grid gap-3 pl-5 text-muted marker:text-cyan">
              <li className="list-disc leading-7">A physical or electronic signature of the copyright owner or a person authorized to act on the owner's behalf.</li>
              <li className="list-disc leading-7">A description of the copyrighted work claimed to have been infringed.</li>
              <li className="list-disc leading-7">The location of the original copyrighted work, such as a URL or other identifying information.</li>
              <li className="list-disc leading-7">The location of the allegedly infringing content on VideoToSRT, with enough detail for us to find it.</li>
              <li className="list-disc leading-7">Your name, mailing address, telephone number, and email address.</li>
              <li className="list-disc leading-7">A statement that you have a good-faith belief that the disputed use is not authorized by the copyright owner, its agent, or the law.</li>
              <li className="list-disc leading-7">A statement, made under penalty of perjury, that the information in your notice is accurate and that you are the copyright owner or authorized to act on the owner's behalf.</li>
            </ul>
          </section>

          <section className="border-b border-line py-7">
            <h2 className="mb-3 text-2xl font-extrabold">Counter-notification process</h2>
            <p className="leading-7 text-muted">
              If content you uploaded was removed or disabled because of a DMCA notice, you may send a counter-notification to{" "}
              <a className="font-semibold text-cyan" href="mailto:support@videotosrt.org">support@videotosrt.org</a>. Your counter-notification must include:
            </p>
            <ul className="mb-0 grid gap-3 pl-5 text-muted marker:text-cyan">
              <li className="list-disc leading-7">Your physical or electronic signature.</li>
              <li className="list-disc leading-7">Identification of the content that was removed or disabled and where it appeared before removal.</li>
              <li className="list-disc leading-7">A statement under penalty of perjury that you have a good-faith belief the content was removed or disabled because of mistake or misidentification.</li>
              <li className="list-disc leading-7">Your name, address, telephone number, and a statement that you consent to the jurisdiction of the federal district court for your address, or if outside the United States, any judicial district where VideoToSRT may be found.</li>
              <li className="list-disc leading-7">A statement that you will accept service of process from the person who submitted the original DMCA notice or that person's agent.</li>
            </ul>
            <p className="mb-0 mt-4 leading-7 text-muted">
              After receiving a valid counter-notification, we may restore the removed content unless the original complainant informs us that they have filed a court action seeking to restrain the allegedly infringing activity.
            </p>
          </section>

          <section className="border-b border-line py-7">
            <h2 className="mb-3 text-2xl font-extrabold">Repeat infringer policy</h2>
            <p className="mb-0 leading-7 text-muted">
              VideoToSRT may suspend or terminate accounts, projects, or access for users who repeatedly infringe copyrights or repeatedly submit infringing content.
              We may also remove content, disable access, or take other appropriate action when required by law or our{" "}
              <Link className="font-semibold text-cyan" href="/terms-of-service">Terms of Service</Link>.
            </p>
          </section>

          <section className="border-b border-line py-7">
            <h2 className="mb-3 text-2xl font-extrabold">Misrepresentations</h2>
            <p className="mb-0 leading-7 text-muted">
              Knowingly submitting false or misleading DMCA notices or counter-notifications may result in legal liability. If you are unsure whether content is infringing, consider seeking legal advice before submitting a notice.
            </p>
          </section>
        </article>
      </main>
      <Footer />
    </>
  );
}
