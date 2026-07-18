import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const targets = [
  { path: "/video-to-srt", h2: 5, faq: 8 },
  { path: "/audio-to-srt", h2: 5, faq: 8 },
  { path: "/mp4-to-srt", h2: 5, faq: 8 },
  { path: "/video-to-text", h2: 5, faq: 8 },
  { path: "/audio-to-text", h2: 5, faq: 8 },
  { path: "/video-to-vtt", h2: 5, faq: 8 },
  { path: "/srt-editor", h2: 5, faq: 8 },
  { path: "/burn-subtitles", h2: 5, faq: 8, howTo: false },
  { path: "/short-form-subtitles", h2: 5, faq: 8, howTo: false },
  { path: "/podcast-transcription", h2: 5, faq: 8 },
  { path: "/course-captions", h2: 5, faq: 8 },
  { path: "/subtitle-translator", h2: 5, faq: 8, howTo: false },
  { path: "/ass-subtitle-editor", h2: 4, faq: 6, howTo: false },
  { path: "/public-url-subtitles", h2: 4, faq: 6, howTo: false }
];

const root = process.cwd();
let failed = false;

const freshnessInputs = [
  "app",
  "components",
  "lib",
  "next.config.mjs",
  "package.json",
  "scripts/check-seo-pages.mjs",
  "tailwind.config.ts",
  "tsconfig.json"
];
const ignoredDirs = new Set([".git", ".next", ".open-next", ".wrangler", "node_modules"]);

function collectFiles(path) {
  if (!existsSync(path)) {
    return [];
  }

  const stats = statSync(path);
  if (!stats.isDirectory()) {
    return [path];
  }

  return readdirSync(path).flatMap((entry) => {
    if (ignoredDirs.has(entry)) {
      return [];
    }

    return collectFiles(join(path, entry));
  });
}

const newestInputMtime = Math.max(...freshnessInputs.flatMap((path) => collectFiles(join(root, path))).map((path) => statSync(path).mtimeMs));

for (const target of targets) {
  const slug = target.path.slice(1);
  const htmlPath = join(root, ".next/server/app", `${slug}.html`);
  if (!existsSync(htmlPath)) {
    failed = true;
    console.error(`${target.path}: FAIL`);
    console.error(`  rendered HTML missing: ${htmlPath}`);
    console.error("  run npm run build before checking rendered SEO pages");
    continue;
  }

  const htmlStats = statSync(htmlPath);
  if (htmlStats.mtimeMs + 1000 < newestInputMtime) {
    failed = true;
    console.error(`${target.path}: FAIL`);
    console.error("  rendered HTML is older than source/config inputs");
    console.error("  run npm run build before checking rendered SEO pages");
    continue;
  }

  const html = readFileSync(htmlPath, "utf8");
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
    ["HowTo schema", target.howTo === false ? !hasHowTo : hasHowTo, hasHowTo]
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
