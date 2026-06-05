import Link from "next/link";

interface SeoLandingProps {
  title: string;
  description: string;
  bullets: string[];
  cta: { label: string; href: string };
  links: Array<{ label: string; href: string }>;
}

export function SeoLanding({ title, description, bullets, cta, links }: SeoLandingProps) {
  return (
    <section className="section-pad">
      <div className="site-container">
        <div className="section-head">
          <h1 className="text-[clamp(38px,5vw,62px)] font-extrabold leading-[1.04]">{title}</h1>
          <p>{description}</p>
        </div>
        <div className="mx-auto max-w-[760px]">
          <ul className="mb-7 grid gap-3">
            {bullets.map((bullet) => (
              <li key={bullet} className="panel-card p-4 text-muted">{bullet}</li>
            ))}
          </ul>
          <div className="mb-7 flex justify-center">
            <Link className="inline-flex min-h-[42px] items-center justify-center rounded bg-indigo px-4 text-sm font-bold text-text shadow-[0_12px_30px_rgba(99,102,241,.22)] transition hover:-translate-y-px" href={cta.href}>
              {cta.label}
            </Link>
          </div>
          <div className="flex flex-wrap justify-center gap-3 text-sm font-semibold text-soft">
            {links.map((link) => (
              <Link key={link.href} className="underline underline-offset-4" href={link.href}>{link.label}</Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
