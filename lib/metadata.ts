import type { Metadata } from "next";

const siteUrl = "https://videotosrt.org";
const siteName = "VideoToSRT";

export function createPageMetadata({
  path,
  title,
  description,
  robots
}: {
  path: string;
  title: string;
  description: string;
  robots?: Metadata["robots"];
}): Metadata {
  const url = path === "/" ? siteUrl : `${siteUrl}${path}`;
  const imageUrl = path === "/" ? "/og-image.png" : `/og-image.png?page=${encodeURIComponent(path.slice(1) || "home")}`;
  const image = {
    url: imageUrl,
    width: 1200,
    height: 630,
    alt: title
  };

  return {
    title: path === "/" ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    robots: robots ?? { index: true, follow: true },
    openGraph: {
      title,
      description,
      url,
      siteName,
      images: [image],
      locale: "en_US",
      type: "website"
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl]
    }
  };
}


export function createPageJsonLd({
  path,
  name,
  description,
  extraNodes = []
}: {
  path: string;
  name: string;
  description: string;
  extraNodes?: Array<Record<string, unknown>>;
}) {
  const url = path === "/" ? siteUrl : `${siteUrl}${path}`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: siteName,
        url: siteUrl,
        logo: `${siteUrl}/logo.svg`
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        name: siteName,
        url: siteUrl,
        publisher: { "@id": `${siteUrl}/#organization` }
      },
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        name,
        description,
        url,
        isPartOf: { "@id": `${siteUrl}/#website` },
        about: { "@id": `${siteUrl}/#organization` }
      },
      ...extraNodes
    ]
  };
}
