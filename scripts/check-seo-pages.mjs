import { readFileSync } from "node:fs";
import { join } from "node:path";

const targets = [
  { path: "/video-to-srt", h2: 5, faq: 8 },
  { path: "/srt-editor", h2: 5, faq: 8 },
  { path: "/burn-subtitles", h2: 5, faq: 8 },
  { path: "/short-form-subtitles", h2: 5, faq: 8 },
  { path: "/podcast-transcription", h2: 5, faq: 8 },
  { path: "/course-captions", h2: 5, faq: 8 },
  { path: "/subtitle-translator", h2: 5, faq: 8 },
  { path: "/ass-subtitle-editor", h2: 4, faq: 6 },
  { path: "/public-url-subtitles", h2: 4, faq: 6 }
];

const root = process.cwd();
let failed = false;

for (const target of targets) {
  const slug = target.path.slice(1);
  const html = readFileSync(join(root, ".next/server/app", `${slug}.html`), "utf8");
  const scripts = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
  const withoutScripts = html.replace(/<script\b[\s\S]*?<\/script>/g, "");
  const h1Count = (withoutScripts.match(/<h1\b/g) ?? []).length;
  const h2Count = (withoutScripts.match(/<h2\b/g) ?? []).length;
  const hrefs = [...withoutScripts.matchAll(/\shref="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((href) => href.startsWith("/") && !href.startsWith("/_next") && href !== target.path);
  const uniqueInternalLinks = new Set(hrefs).size;

  let faqCount = 0;
  let hasBreadcrumb = false;
  let hasHowTo = false;
  let jsonLdOk = scripts.length > 0;

  for (const script of scripts) {
    try {
      const data = JSON.parse(script);
      const graph = Array.isArray(data["@graph"]) ? data["@graph"] : [data];
      for (const node of graph) {
        if (node?.["@type"] === "FAQPage") {
          faqCount += Array.isArray(node.mainEntity) ? node.mainEntity.length : 0;
        }
        if (node?.["@type"] === "BreadcrumbList") {
          hasBreadcrumb = true;
        }
        if (node?.["@type"] === "HowTo") {
          hasHowTo = true;
        }
      }
    } catch (error) {
      jsonLdOk = false;
      console.error(`${target.path}: invalid JSON-LD - ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const checks = [
    ["one H1", h1Count === 1, h1Count],
    [`at least ${target.h2} H2`, h2Count >= target.h2, h2Count],
    [`at least ${target.faq} FAQ schema questions`, faqCount >= target.faq, faqCount],
    ["at least 3 contextual internal links", uniqueInternalLinks >= 3, uniqueInternalLinks],
    ["valid JSON-LD", jsonLdOk, scripts.length],
    ["BreadcrumbList schema", hasBreadcrumb, hasBreadcrumb],
    ["HowTo schema", hasHowTo, hasHowTo]
  ];

  const bad = checks.filter(([, ok]) => !ok);
  if (bad.length) {
    failed = true;
    console.error(`${target.path}: FAIL`);
    for (const [label, , value] of bad) {
      console.error(`  ${label}: ${value}`);
    }
  } else {
    console.log(`${target.path}: OK (H1 ${h1Count}, H2 ${h2Count}, FAQ ${faqCount}, internal links ${uniqueInternalLinks})`);
  }
}

if (failed) {
  process.exit(1);
}
