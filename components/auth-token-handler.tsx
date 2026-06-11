"use client";

import { useEffect } from "react";
import { setAuthToken, refreshAuthUser } from "@/lib/auth";

export function AuthTokenHandler() {
  useEffect(() => {
    // Try to extract token from URL hash
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
      const token = params.get("token");
      if (token) {
        console.log("[AuthTokenHandler] Found token in hash, saving...");
        setAuthToken(token);
        params.delete("token");
        window.location.hash = params.toString();
        refreshAuthUser();
        return;
      }
    }

    // Also check query params as fallback
    const urlParams = new URLSearchParams(window.location.search);
    const queryToken = urlParams.get("token");
    if (queryToken) {
      console.log("[AuthTokenHandler] Found token in query, saving...");
      setAuthToken(queryToken);
      urlParams.delete("token");
      const newUrl = window.location.pathname + (urlParams.toString() ? "?" + urlParams.toString() : "") + window.location.hash;
      window.history.replaceState({}, "", newUrl);
      refreshAuthUser();
    }
  }, []);

  return null;
}
