"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    plausible?: (eventName: string, options?: Record<string, unknown>) => void;
  }
}

const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN || "videotosrt.org";

function AnalyticsPageViews() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = searchParams.toString();
    const pagePath = query ? `${pathname}?${query}` : pathname;

    if (gaMeasurementId && window.gtag) {
      window.gtag("config", gaMeasurementId, { page_path: pagePath });
    } else if (window.plausible) {
      window.plausible("pageview", { props: { path: pagePath } });
    }
  }, [pathname, searchParams]);

  return null;
}

export function Analytics() {
  return (
    <>
      {gaMeasurementId ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`} strategy="afterInteractive" />
          <Script id="ga4-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('js', new Date());
              gtag('config', '${gaMeasurementId}', { page_path: window.location.pathname + window.location.search });
            `}
          </Script>
        </>
      ) : (
        <Script
          defer
          data-domain={plausibleDomain}
          src="https://plausible.io/js/script.js"
          strategy="afterInteractive"
        />
      )}
      <Suspense fallback={null}>
        <AnalyticsPageViews />
      </Suspense>
    </>
  );
}
