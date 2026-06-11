import type { Metadata } from "next";

const siteUrl = "https://videotosrt.org";
const siteName = "VideoToSRT";
const image = {
  url: "/og-image.png",
  width: 1200,
  height: 630,
  alt: siteName
};

const pageImages: Record<string, typeof image> = {
  "/pricing": { ...image, url: "/og-pricing.png", alt: "VideoToSRT pricing" },
  "/video-to-srt": { ...image, url: "/og-video-to-srt.png", alt: "Video to SRT converter" },
  "/editor": { ...image, url: "/og-editor.png", alt: "Online subtitle editor" }
};

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
  const pageImage = pageImages[path] ?? image;

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
      images: [pageImage],
      locale: "en_US",
      type: "website"
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [pageImage.url]
    }
  };
}
