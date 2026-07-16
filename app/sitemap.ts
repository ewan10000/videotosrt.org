import type { MetadataRoute } from "next";

const routes = [
  "",
  "/pricing",
  "/editor",
  "/faq",
  "/contact",
  "/privacy-policy",
  "/terms-of-service",
  "/dmca",
  "/video-to-srt",
  "/srt-editor",
  "/burn-subtitles",
  "/public-url-subtitles",
  "/short-form-subtitles",
  "/podcast-transcription",
  "/course-captions",
  "/subtitle-translator",
  "/ass-subtitle-editor"
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({
    url: `https://videotosrt.org${route}`,
    changeFrequency: route === "" ? ("weekly" as const) : ("monthly" as const),
    priority: route === "" ? 1 : 0.7
  }));
}
