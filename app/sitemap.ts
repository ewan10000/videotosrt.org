import type { MetadataRoute } from "next";

const routes = [
  "",
  "/pricing",
  "/editor",
  "/faq",
  "/tools",
  "/contact",
  "/privacy-policy",
  "/terms-of-service",
  "/dmca",
  "/video-to-srt",
  "/audio-to-srt",
  "/mp4-to-srt",
  "/video-to-text",
  "/audio-to-text",
  "/video-to-vtt",
  "/srt-editor",
  "/podcast-transcription",
  "/course-captions"
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({
    url: `https://videotosrt.org${route}`,
    changeFrequency: route === "" ? ("weekly" as const) : ("monthly" as const),
    priority: route === "" ? 1 : 0.7
  }));
}
