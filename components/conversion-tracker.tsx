"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackConversionEvent } from "@/lib/conversion-events";

export function ConversionTracker() {
  const pathname = usePathname();
  const trackedNavigationRef = useRef("");

  useEffect(() => {
    if (!pathname) {
      return;
    }

    if (trackedNavigationRef.current === pathname) {
      return;
    }

    if (pathname === "/") {
      trackedNavigationRef.current = pathname;
      trackConversionEvent("landing_page_view");
    }

    if (pathname === "/pricing") {
      trackedNavigationRef.current = pathname;
      trackConversionEvent("pricing_viewed");
    }

    if (pathname === "/editor") {
      trackedNavigationRef.current = pathname;
      trackConversionEvent("editor_opened");
    }
  }, [pathname]);

  return null;
}
