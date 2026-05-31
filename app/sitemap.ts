import type { MetadataRoute } from "next";

const routes = ["", "/pricing", "/editor", "/privacy-policy", "/terms-of-service"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({
    url: `https://videotosrt.org${route}`,
    lastModified: new Date("2026-05-31"),
    changeFrequency: route === "" ? ("weekly" as const) : ("monthly" as const),
    priority: route === "" ? 1 : 0.7
  }));
}
