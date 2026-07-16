import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const activeCopyFiles = [
  "app/page.tsx",
  "app/faq/page.tsx",
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
];

for (const file of activeCopyFiles) {
  const source = readFileSync(file, "utf8");
  for (const pattern of forbidden) {
    assert.equal(pattern.test(source), false, `${file} contains forbidden claim ${pattern}`);
  }
}

const homeSections = readFileSync("components/sections/home-sections.tsx", "utf8");
const heroStart = homeSections.indexOf("export function HeroSection()");
const heroEnd = homeSections.indexOf("function UploadPanel()", heroStart);
assert.notEqual(heroStart, -1, "homepage hero exists");
assert.notEqual(heroEnd, -1, "homepage upload panel follows hero");
const heroBlock = homeSections.slice(heroStart, heroEnd);
assert.equal(/25\s*MB|25MB/i.test(heroBlock), false, "hero must not present 25 MB as a primary product limit");
assert.match(heroBlock, /Free includes 60 minutes per month and 60 minutes per file/);
assert.match(heroBlock, /Google sign-in is required for AI transcription, account export, checkout, and paid usage/);

assert.equal(/Technical Upload Guard/i.test(homeSections), false, "homepage features must not promote a technical upload guard");
assert.match(homeSections, /Plan limits are duration based: Free 60, Pro 180, and Studio 360 minutes per file/);
assert.match(homeSections, /25 MB technical payload guard today/, "FAQ may disclose the temporary technical guard secondarily");

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
for (const route of ["burn-subtitles", "short-form-subtitles", "subtitle-translator", "ass-subtitle-editor", "public-url-subtitles"]) {
  const start = landing.indexOf(`"${route}": {`);
  assert.notEqual(start, -1, `${route} exists`);
  const end = landing.indexOf("\n  },", start);
  const block = landing.slice(start, end);
  assert.match(block, /unavailableProduct: true/, `${route} is marked unavailable/noindex`);
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

console.log("frontend product truth tests passed");
