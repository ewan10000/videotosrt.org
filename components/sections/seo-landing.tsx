import Link from "next/link";

export interface SeoLandingStep {
  title: string;
  body: string;
}

export interface SeoLandingFeature {
  title: string;
  body: string;
}

export interface SeoLandingTable {
  columns: string[];
  rows: string[][];
}

export interface SeoLandingSection {
  heading: string;
  body?: string[];
  features?: SeoLandingFeature[];
  steps?: SeoLandingStep[];
  table?: SeoLandingTable;
  links?: Array<{ label: string; href: string }>;
}

export interface SeoLandingFaq {
  question: string;
  answer: string;
}

export interface SeoLandingCta {
  heading: string;
  body: string;
  primary: { label: string; href: string };
  secondary?: { label: string; href: string };
}

export interface SeoLandingProps {
  title: string;
  description: string;
  eyebrow?: string;
  highlights: string[];
  sections: SeoLandingSection[];
  faq: SeoLandingFaq[];
  cta: SeoLandingCta;
  links: Array<{ label: string; href: string }>;
}

export function SeoLanding({
  title,
  description,
  eyebrow = "Subtitle workflow",
  highlights,
  sections,
  faq,
  cta,
  links
}: SeoLandingProps) {
  return (
    <>
      <header className="section-pad border-b border-soft/15">
        <div className="site-container grid gap-8 lg:grid-cols-[1fr_360px] lg:items-end">
          <div>
            <span className="eyebrow"><span className="dot" /> {eyebrow}</span>
            <h1 className="mb-5 mt-5 max-w-[860px] text-[clamp(38px,5vw,62px)] font-extrabold leading-[1.04]">{title}</h1>
            <p className="mb-0 max-w-[760px] text-lg leading-[1.75] text-muted">{description}</p>
          </div>
          <div className="panel-card p-5">
            <p className="mb-4 text-sm font-extrabold uppercase text-cyan">Good for</p>
            <ul className="grid gap-3">
              {highlights.map((highlight) => (
                <li key={highlight} className="border-l-2 border-cyan/70 pl-3 text-sm font-semibold leading-6 text-soft">{highlight}</li>
              ))}
            </ul>
          </div>
        </div>
      </header>

      {sections.map((section, index) => (
        <LandingSection key={section.heading} section={section} muted={index % 2 === 1} />
      ))}

      <section className="section-pad" id="faq">
        <div className="site-container">
          <div className="section-head">
            <h2>Frequently Asked Questions</h2>
            <p>Direct answers for the workflow, formats, limits, and exports covered on this page.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {faq.map((item) => (
              <article key={item.question} className="panel-card p-5">
                <h3 className="mb-2 text-lg font-extrabold">{item.question}</h3>
                <p className="mb-0 leading-7 text-muted">{item.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section-pad border-y border-soft/15 bg-[#101A2E]">
        <div className="site-container grid gap-8 lg:grid-cols-[1fr_360px] lg:items-center">
          <div>
            <h2 className="mb-4 text-[clamp(30px,4vw,44px)] font-extrabold leading-[1.08]">{cta.heading}</h2>
            <p className="mb-0 max-w-[720px] text-lg leading-[1.7] text-muted">{cta.body}</p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Link className="inline-flex min-h-[42px] items-center justify-center rounded bg-indigo px-4 text-sm font-bold text-text shadow-[0_12px_30px_rgba(99,102,241,.22)] transition hover:-translate-y-px" href={cta.primary.href}>
              {cta.primary.label}
            </Link>
            {cta.secondary ? (
              <Link className="inline-flex min-h-[42px] items-center justify-center rounded border border-line bg-white/[.03] px-4 text-sm font-bold text-text transition hover:-translate-y-px" href={cta.secondary.href}>
                {cta.secondary.label}
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <section className="section-pad">
        <div className="site-container">
          <div className="section-head">
            <h2>Related Subtitle Tools</h2>
            <p>Move between transcription, editing, translation, and export workflows without leaving VideoToSRT.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {links.map((link) => (
              <Link key={link.href} className="panel-card p-4 text-sm font-extrabold text-soft transition hover:-translate-y-px hover:border-cyan hover:text-text" href={link.href}>
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function LandingSection({ section, muted }: { section: SeoLandingSection; muted: boolean }) {
  return (
    <section className={`section-pad ${muted ? "border-y border-soft/15 bg-[#101A2E]" : ""}`}>
      <div className="site-container">
        <div className="section-head">
          <h2>{section.heading}</h2>
          {section.body?.[0] ? <p>{section.body[0]}</p> : null}
        </div>
        {section.body?.slice(1).map((paragraph) => (
          <p key={paragraph} className="mb-4 max-w-[860px] leading-7 text-muted">{paragraph}</p>
        ))}
        {section.features ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {section.features.map((feature) => (
              <article key={feature.title} className="panel-card p-5">
                <h3 className="mb-2 text-lg font-extrabold">{feature.title}</h3>
                <p className="mb-0 leading-7 text-muted">{feature.body}</p>
              </article>
            ))}
          </div>
        ) : null}
        {section.steps ? (
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {section.steps.map((step, index) => (
              <article key={step.title} className="panel-card p-5">
                <div className="mb-4 grid h-9 w-9 place-items-center rounded bg-indigo/20 text-sm font-extrabold text-cyan">{index + 1}</div>
                <h3 className="mb-2 text-lg font-extrabold">{step.title}</h3>
                <p className="mb-0 leading-7 text-muted">{step.body}</p>
              </article>
            ))}
          </div>
        ) : null}
        {section.table ? (
          <div className="mt-6 overflow-x-auto rounded border border-line">
            <table className="w-full min-w-[680px] border-collapse text-left text-sm">
              <thead className="bg-panel-2 text-text">
                <tr>
                  {section.table.columns.map((column) => (
                    <th key={column} className="border-b border-line p-4 font-extrabold">{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {section.table.rows.map((row) => (
                  <tr key={row.join("|")} className="odd:bg-white/[.025]">
                    {row.map((cell) => (
                      <td key={cell} className="border-b border-line p-4 leading-6 text-muted">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {section.links ? (
          <div className="mt-6 flex flex-wrap gap-3">
            {section.links.map((link) => (
              <Link key={link.href} className="text-sm font-extrabold text-cyan underline underline-offset-4" href={link.href}>{link.label}</Link>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
