import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";

const siteUrl = "https://videotosrt.org";

type Breadcrumb = {
  label: string;
  href: string;
};

type BreadcrumbsProps = {
  items: Breadcrumb[];
};

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  const fullItems = [{ label: "Home", href: "/" }, ...items];
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: fullItems.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      item: `${siteUrl}${item.href === "/" ? "" : item.href}`
    }))
  };

  return (
    <>
      <JsonLd data={schema} />
      <nav className="site-container pt-6 text-sm font-semibold text-soft" aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-2">
          {fullItems.map((item, index) => (
            <li key={item.href} className="flex items-center gap-2">
              {index > 0 ? <span aria-hidden="true">/</span> : null}
              {index === fullItems.length - 1 ? (
                <span className="text-text">{item.label}</span>
              ) : (
                <Link className="underline underline-offset-4 hover:text-text" href={item.href}>
                  {item.label}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
