import type { Metadata } from "next";

const siteUrl = "https://videotosrt.org";
const siteName = "VideoToSRT";
const image = {
  url: "/og-image.png",
  width: 1200,
  height: 630,
  alt: siteName
};

export function createPageMetadata({
  path,
  title,
  description
}: {
  path: string;
  title: string;
  description: string;
}): Metadata {
  const url = path === "/" ? siteUrl : `${siteUrl}${path}`;

  return {
    title: path === "/" ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
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
      images: [image.url]
    }
  };
}
