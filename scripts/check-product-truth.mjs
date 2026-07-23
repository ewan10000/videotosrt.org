import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const activeCopyFiles = [
  "app/page.tsx",
  "app/faq/page.tsx",
  "app/tools/page.tsx",
  "app/pricing/page.tsx",
  "app/layout.tsx",
  "components/sections/home-sections.tsx",
  "components/sections/pricing-client.tsx",
  "components/modals/export-modal.tsx",
  "components/modals/login-modal.tsx",
];

const forbidden = [
  /GitHub/i,
  /Continue with email/i,
  /ASS\/SSA|ASS Pro/i,
  /burn-in export|Burn-in Preview/i,
  /batch processing|Batch Process/i,
  /team seats|Team \(3 seats\)/i,
  /API access/i,
  /brand templates/i,
  /style templates/i,
  /95%\+/i,
  /1GB|2GB/i,
  /money-back guarantee/i,
  /send you the file/i,
  /MVP/i,
  /Whisper-powered/i,
];

for (const file of activeCopyFiles) {
  const source = readFileSync(file, "utf8");
  for (const pattern of forbidden) {
    assert.equal(pattern.test(source), false, `${file} contains forbidden claim ${pattern}`);
  }
}

const homeSections = readFileSync("components/sections/home-sections.tsx", "utf8");
const retentionCopyPattern = /daily retention job deletes uploaded media under uploads\/ from R2 after it is older than 7 days/i;
const browserDraftPattern = /Local (?:editor )?drafts remain in your browser until you clear them/i;
const heroStart = homeSections.indexOf("export function HeroSection()");
const heroEnd = homeSections.indexOf("function UploadPanel()", heroStart);
assert.notEqual(heroStart, -1, "homepage hero exists");
assert.notEqual(heroEnd, -1, "homepage upload panel follows hero");
const heroBlock = homeSections.slice(heroStart, heroEnd);
assert.equal(/25\s*MB|25MB/i.test(heroBlock), false, "hero must not present 25 MB as a primary product limit");
assert.match(heroBlock, /Free includes 60 minutes per month and 60 minutes per file/);
assert.match(heroBlock, /Google sign-in is required for AI transcription, account export, checkout, and paid usage/);

assert.match(homeSections, /Plan limits are duration based: Free 60, Pro 180, and Studio 360 minutes per file/);
assert.match(homeSections, /25 MB technical upload guard|25 MB technical guard/, "homepage discloses the technical guard near upload/transcription copy");
assert.match(homeSections, retentionCopyPattern, "homepage states verified 7-day uploaded media retention");
assert.match(homeSections, browserDraftPattern, "homepage notes local drafts stay in the browser");

for (const name of ["John", "Sarah", "Mike", "Lisa"]) {
  assert.equal(new RegExp(`\\b${name}\\b`).test(homeSections), false, `homepage must not contain fabricated testimonial name ${name}`);
}
assert.equal(/Early User Feedback/i.test(homeSections), false, "homepage must not present fabricated feedback");
assert.equal(/<p[^>]*>\s*&quot;|<p[^>]*>\s*"/.test(homeSections), false, "workflow cards must not be testimonial quotes");
assert.match(homeSections, /Common Workflows/);

const uploadStart = homeSections.indexOf("function UploadPanel()");
const uploadEnd = homeSections.indexOf("export function WorkflowSection()", uploadStart);
assert.notEqual(uploadStart, -1, "upload panel exists");
assert.notEqual(uploadEnd, -1, "upload panel block has an end");
const uploadBlock = homeSections.slice(uploadStart, uploadEnd);
assert.equal(/role=["']button["']/.test(uploadBlock), false, "upload dropzone must not use a role button wrapper");
assert.equal(/<button[\s\S]*type=["']file["']|type=["']file["'][\s\S]*<button/.test(uploadBlock), false, "upload dropzone must not nest file controls with buttons");
assert.match(uploadBlock, /<label[\s\S]*htmlFor=\{inputId\}/, "upload dropzone uses a semantic label for the file input");
assert.match(uploadBlock, /peer-focus-visible:outline/, "upload dropzone has visible keyboard focus styling");

const metadata = readFileSync("lib/metadata.ts", "utf8");
assert.match(metadata, /logo: `\$\{siteUrl\}\/apple-touch-icon\.png`/);
assert.equal(/priceCurrency:\s*["']USD["'][^}\]]*url:\s*`\$\{siteUrl\}\/pricing`/.test(metadata), false, "SoftwareApplication JSON-LD must not emit a paid Offer without a price");

const jsonLd = readFileSync("components/seo/json-ld.tsx", "utf8");
assert.match(jsonLd, /export function serializeJsonLd/);
assert.ok(jsonLd.includes('.replaceAll("<", "\\\\u003c")'));
assert.ok(jsonLd.includes('.replaceAll(">", "\\\\u003e")'));
assert.ok(jsonLd.includes('.replaceAll("&", "\\\\u0026")'));
assert.ok(jsonLd.includes('.replaceAll("\\u2028", "\\\\u2028")'));
assert.ok(jsonLd.includes('.replaceAll("\\u2029", "\\\\u2029")'));
assert.match(jsonLd, /dangerouslySetInnerHTML=\{\{ __html: serializeJsonLd\(data\) \}\}/);

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if ([".git", ".next", ".open-next", ".wrangler", "node_modules"].includes(entry)) {
      return [];
    }
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const dangerousHtmlFiles = walk(".").filter((file) => {
  if (file === "scripts/check-product-truth.mjs") {
    return false;
  }
  if (!/\.(tsx?|jsx?|mjs)$/.test(file)) {
    return false;
  }
  return readFileSync(file, "utf8").includes("dangerouslySetInnerHTML");
});
assert.deepEqual(dangerousHtmlFiles, ["components/seo/json-ld.tsx"]);

const landing = readFileSync("lib/seo-landing-pages.ts", "utf8");
assert.match(landing, retentionCopyPattern, "landing pages state verified 7-day uploaded media retention");
assert.match(landing, browserDraftPattern, "landing pages note local drafts stay in the browser");
function withoutTruthfulUnsupportedDisclaimers(text) {
  return text
    .replace(/[^.?!]*(?:does not|do not|not currently|not part of|not available|No\.)[^.?!]*[.?!]/gi, " ")
    .replace(/[^.?!]*VideoToSRT currently focuses on[^.?!]*not [^.?!]*[.?!]/gi, " ");
}

const unsupportedNewRouteClaims = [
  {
    label: "public URL ingestion",
    pattern: /\b(?:VideoToSRT|product|workflow|converter|tool)\b[^.?!]*(?:supports|accepts|imports|ingests|transcribes|converts|generates)[^.?!]*(?:public URL|video URL|audio URL|YouTube link|YouTube URL|from URL|from a link)/i
  },
  {
    label: "summarization",
    pattern: /\b(?:VideoToSRT|product|workflow|converter|tool)\b[^.?!]*(?:summarizes|creates? summaries|provides? summarization|exports? summaries|AI summaries)/i
  },
  {
    label: "automatic speaker labels",
    pattern: /\b(?:VideoToSRT|product|workflow|converter|tool|AI)\b[^.?!]*(?:automatically labels? speakers|speaker diarization|diarizes|adds? speaker labels? automatically)/i
  },
  {
    label: "styled or dynamic caption output",
    pattern: /\b(?:VideoToSRT|product|workflow|converter|tool)\b[^.?!]*(?:creates?|exports?|supports|offers)[^.?!]*(?:styled captions?|dynamic captions?|ASS\/SSA|ASS subtitles?|SSA subtitles?|style templates?)/i
  },
  {
    label: "burn-in or hardcoded video output",
    pattern: /\b(?:VideoToSRT|product|workflow|converter|tool)\b[^.?!]*(?:burns?|burns in|creates?|exports?|supports|offers)[^.?!]*(?:burned-in|burn-in|hardcoded|hard-coded|permanent visible captions?)/i
  },
  {
    label: "batch processing",
    pattern: /\b(?:VideoToSRT|product|workflow|converter|tool)\b[^.?!]*(?:batch|bulk|multiple files at once|many files at once)/i
  }
];

for (const route of ["audio-to-srt", "mp4-to-srt", "video-to-text", "audio-to-text", "video-to-vtt"]) {
  const start = landing.indexOf(`"${route}": {`);
  assert.notEqual(start, -1, `${route} exists`);
  const end = landing.indexOf("\n  },", start);
  const block = landing.slice(start, end);
  const claimBlock = withoutTruthfulUnsupportedDisclaimers(block);
  assert.equal(/unavailableProduct: true/.test(block), false, `${route} must be an available/indexable landing page`);
  assert.match(block, /VideoToSRT currently exports SRT, VTT, and TXT/, `${route} states current export formats`);
  assert.match(block, /Accuracy depends|automatic transcript/i, `${route} includes accuracy or review caveat`);
  for (const { label, pattern } of unsupportedNewRouteClaims) {
    assert.equal(pattern.test(claimBlock), false, `${route} must not claim ${label}`);
  }
}
assert.equal(/Move between transcription, editing, translation, and export workflows/.test(landing), false, "related links must not imply in-app translation");
assert.match(landing, /href: "\/audio-to-srt"/);
assert.match(landing, /href: "\/mp4-to-srt"/);
assert.match(landing, /href: "\/video-to-text"/);
assert.match(landing, /href: "\/audio-to-text"/);
assert.match(landing, /href: "\/video-to-vtt"/);

const sitemap = readFileSync("app/sitemap.ts", "utf8");
for (const route of ["/audio-to-srt", "/mp4-to-srt", "/video-to-text", "/audio-to-text", "/video-to-vtt"]) {
  assert.match(sitemap, new RegExp(`"${route}"`), `sitemap contains ${route}`);
}
assert.match(sitemap, /"\/tools"/, "sitemap contains tools page");
for (const route of ["burn-subtitles", "short-form-subtitles", "subtitle-translator", "ass-subtitle-editor", "public-url-subtitles"]) {
  const start = landing.indexOf(`"${route}": {`);
  assert.notEqual(start, -1, `${route} exists`);
  const end = landing.indexOf("\n  },", start);
  const block = landing.slice(start, end);
  assert.match(block, /unavailableProduct: true/, `${route} is marked unavailable/noindex`);
  assert.equal(new RegExp(`"${route}"`).test(sitemap), false, `sitemap excludes unavailable ${route}`);
}
assert.match(landing, /!page\.unavailableProduct && page\.howToName/);
assert.match(landing, /page\.unavailableProduct \? \{ index: false, follow: true \}/);
assert.match(landing, /VideoToSRT currently exports SRT, VTT, and TXT/);

const unavailableCapabilityClaims = [
  /paid-plan availability/i,
  /paid export features/i,
  /final burn-in export may/i,
  /VIP is active locally/i,
  /plan features/i,
  /plan support/i,
  /where your plan supports/i,
  /supported by your plan/i,
  /current plan availability/i,
  /VideoToSRT supports[^.]*ASS\/SSA/i,
  /VideoToSRT supports[^.]*burn-in/i,
  /VideoToSRT supports[^.]*burned-in/i,
];

for (const pattern of unavailableCapabilityClaims) {
  assert.equal(pattern.test(landing), false, `landing pages contain forbidden unavailable-capability claim ${pattern}`);
}

const pricingClient = readFileSync("components/sections/pricing-client.tsx", "utf8");
assert.equal(/activateLocalPlan/.test(pricingClient), false, "pricing client must not locally activate plans");
assert.equal(/subscription_status:\s*["']ACTIVE["']/.test(pricingClient), false, "pricing client must not forge active subscription status");
assert.equal(/active locally/i.test(pricingClient), false, "pricing client must not claim local VIP activation");
assert.match(pricingClient, /syncPaypalSubscription/);
assert.match(pricingClient, /Payment returned without a subscription ID/);
assert.match(pricingClient, /authLoginUrl\("google", "\/pricing"\)/, "unauthenticated paid CTAs start Google sign-in with pricing return");
assert.match(pricingClient, /checkout_intent/, "pricing tracks checkout intent");

const checkoutSuccessStart = pricingClient.indexOf('if (checkoutState === "success")');
assert.notEqual(checkoutSuccessStart, -1, "pricing client handles successful checkout returns");
const checkoutSuccessEnd = pricingClient.indexOf('if (checkoutState === "cancelled")', checkoutSuccessStart);
assert.notEqual(checkoutSuccessEnd, -1, "pricing client success handler ends before cancelled handler");
const checkoutSuccessBlock = pricingClient.slice(checkoutSuccessStart, checkoutSuccessEnd);
const syncStart = checkoutSuccessBlock.indexOf("syncPaypalSubscription");
assert.notEqual(syncStart, -1, "successful checkout return syncs PayPal subscription");
const beforeSync = checkoutSuccessBlock.slice(0, syncStart);
assert.equal(/setLocalUser\(|subscription_status|setUser\(nextUser\)/.test(beforeSync), false, "URL query or pending checkout metadata must not grant local VIP before server sync");

const plansSource = readFileSync("lib/plans.ts", "utf8");
assert.equal(/monthly:\s*["']/.test(plansSource), false, "billing periods must not be plan aliases");
assert.equal(/yearly:\s*["']/.test(plansSource), false, "billing periods must not be plan aliases");
assert.equal(/canUseStyledExport/.test(plansSource), false, "styled export must not be exposed as available");
assert.match(plansSource, /free:\s*"free"/);
assert.match(plansSource, /pro:\s*"pro"/);
assert.match(plansSource, /studio:\s*"studio"/);
assert.match(plansSource, /team:\s*"studio"/);
assert.match(plansSource, /business:\s*"studio"/);
const mergeStart = plansSource.indexOf("export function mergeStoredMembership");
assert.notEqual(mergeStart, -1, "mergeStoredMembership exists");
const mergeBlock = plansSource.slice(mergeStart);
assert.equal(/plan:\s*storedUser\.plan/.test(mergeBlock), false, "stored membership merge must not restore a locally cached paid plan");

const eventsRoute = readFileSync("app/api/events/route.ts", "utf8");
assert.match(eventsRoute, /CREATE TABLE IF NOT EXISTS conversion_events/);
assert.match(eventsRoute, /conversion_event_daily/);
assert.match(eventsRoute, /Too many events/);
assert.match(eventsRoute, /isSameOriginRequest/, "events route validates same-origin requests");
assert.match(eventsRoute, /eventsSchemaReadyPromise/, "events route initializes schema once per isolate");
assert.match(eventsRoute, /checkAndIncrementRateLimit/, "events route rate limit is checked before accepting events");
assert.match(eventsRoute, /conversion-rate-v1/, "events route derives a one-way rotating rate key");
assert.match(eventsRoute, /DELETE FROM conversion_events WHERE created_at < datetime\('now', '-30 days'\)/, "events route cleans detailed events after 30 days");
assert.match(eventsRoute, /ctx\.waitUntil\(cleanup\)/, "events route schedules cleanup with request execution context");
assert.equal(/createRateLimitKey\([^)]*anonymousId/.test(eventsRoute), false, "events route must not use anonymousId for rate limiting");
assert.equal(/raw_ip|ip_address|cf-connecting-ip|x-forwarded-for/i.test(eventsRoute), false, "events route must not store raw IP fields");
assert.match(eventsRoute, /download_initiated/);
assert.equal(/export_completed/.test(eventsRoute), false, "server event allowlist must not claim export completion");

const middlewareSource = readFileSync("middleware.ts", "utf8");
assert.match(middlewareSource, /"\/api\/events"/, "middleware must route /api/events locally");
const workerSource = readFileSync("worker.ts", "utf8");
assert.match(workerSource, /url\.pathname === "\/api\/events"/, "worker must route /api/events locally");

const layoutSource = readFileSync("app/layout.tsx", "utf8");
assert.match(layoutSource, /<ConversionTracker \/>/, "layout must render conversion tracker");
const conversionTrackerSource = readFileSync("components/conversion-tracker.tsx", "utf8");
assert.match(conversionTrackerSource, /usePathname/, "conversion tracker must observe App Router navigation");
assert.match(conversionTrackerSource, /trackedNavigationRef/, "conversion tracker must dedupe per navigation");
assert.match(conversionTrackerSource, /landing_page_view/);
assert.match(conversionTrackerSource, /pricing_viewed/);
assert.match(conversionTrackerSource, /editor_opened/);

assert.match(pricingClient, /isPendingCheckoutIntent/, "pending checkout intent is runtime validated");
assert.match(pricingClient, /getValidApprovalUrl/, "checkout requires a valid approval URL");
const resumeStart = pricingClient.indexOf("const intent = nextUser ? readPendingCheckoutIntent() : null");
const resumeEnd = pricingClient.indexOf("const params = new URLSearchParams", resumeStart);
assert.equal(/removeItem\(PENDING_CHECKOUT_INTENT_KEY\)/.test(pricingClient.slice(resumeStart, resumeEnd)), false, "pending checkout intent must not be removed before checkout creation");
const approvalStart = pricingClient.indexOf("const url = getValidApprovalUrl(data)");
assert.notEqual(approvalStart, -1, "checkout validates approval URL");
const approvalBlock = pricingClient.slice(approvalStart, pricingClient.indexOf("window.location.href = url", approvalStart));
assert.match(approvalBlock, /removeItem\(PENDING_CHECKOUT_INTENT_KEY\)/, "pending checkout intent is cleared only after approval URL validation");

const conversionEventsSource = readFileSync("lib/conversion-events.ts", "utf8");
assert.match(conversionEventsSource, /download_initiated/);
assert.equal(/export_completed/.test(conversionEventsSource), false, "client event enum must not claim export completion");
const exportModalSource = readFileSync("components/modals/export-modal.tsx", "utf8");
assert.match(exportModalSource, /export_started/);
assert.match(exportModalSource, /download_initiated/);
assert.equal(/export_completed/.test(exportModalSource), false, "export modal must not claim export completion");
const editorClientSource = readFileSync("components/sections/editor-client.tsx", "utf8");
assert.match(editorClientSource, /errorType: "technical_size_guard"/, "25 MB AI guard is tracked as transcription failure, not upload rejection");
assert.match(editorClientSource, /\) : hasProject && !rows\.length && !isTranscribing \? \(/, "empty editor state must not render duplicate Generate CTAs");
assert.match(editorClientSource, /max-w-full overflow-x-hidden bg-bg text-text min-\[760px\]:hidden/, "mobile editor shell must prevent page-level horizontal overflow");
assert.match(editorClientSource, /min-\[360px\]:grid-cols-2/, "mobile editor actions must collapse to one column and grow to two columns");
assert.match(editorClientSource, /className="w-full px-3"/, "mobile generate CTA must fit the viewport and wrap instead of clipping");
assert.match(editorClientSource, /<div className="min-h-0 overflow-auto">\s*<table className="w-full min-w-\[520px\]/, "subtitle table horizontal scroll must stay inside the table container");
const homeUploadSource = readFileSync("components/home-upload-button.tsx", "utf8");
assert.equal(/file\.size > TECHNICAL_TRANSCRIPTION_UPLOAD_BYTES \? "file_rejected" : "file_selected"/.test(homeUploadSource), false, "large home uploads are still accepted for local editing");

console.log("frontend product truth tests passed");
