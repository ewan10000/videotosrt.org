"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch, type ApiUserResponse } from "@/lib/api";
import { normalizeUser, clearSessionToken, setLocalUser } from "@/lib/auth";
import { trackConversionEvent } from "@/lib/conversion-events";

function safeReturnTo(value: string | null) {
  if (!value) {
    return "/";
  }

  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin || url.pathname.startsWith("/auth/")) {
      return "/";
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}

function getSessionTokenFromLocation() {
  const searchParams = new URLSearchParams(window.location.search);
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
  const hashParams = new URLSearchParams(hash);

  return (
    searchParams.get("token") ??
    searchParams.get("session_token") ??
    searchParams.get("sessionToken") ??
    hashParams.get("token") ??
    hashParams.get("session_token") ??
    hashParams.get("sessionToken") ??
    ""
  );
}

function cleanSessionTokenFromLocation() {
  const url = new URL(window.location.href);
  const searchParams = new URLSearchParams(url.search);
  const hash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
  const hashParams = new URLSearchParams(hash);

  for (const name of ["token", "session_token", "sessionToken", "handoff"]) {
    searchParams.delete(name);
    hashParams.delete(name);
  }

  url.search = searchParams.toString() ? `?${searchParams.toString()}` : "";
  url.hash = hashParams.toString() ? `#${hashParams.toString()}` : "";
  window.history.replaceState(window.history.state, "", url.toString());
}

export function AuthCompleteClient() {
  const completionRequest = useRef<Promise<ApiUserResponse> | null>(null);
  const [message, setMessage] = useState("Finishing sign in...");
  const returnTo = useMemo(() => {
    if (typeof window === "undefined") {
      return "/";
    }

    return safeReturnTo(new URLSearchParams(window.location.search).get("returnTo"));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function finishSignIn() {
      const handoff = new URLSearchParams(window.location.hash.slice(1)).get("handoff");
      const token = getSessionTokenFromLocation();

      if (!token && !handoff && !completionRequest.current) {
        setMessage("Sign in did not return a session. Please try again.");
        return;
      }

      try {
        completionRequest.current ??= apiFetch<ApiUserResponse>("/auth/session/complete", {
          body: handoff ? { handoff } : { token },
          method: "POST"
        });
        cleanSessionTokenFromLocation();
        const data = await completionRequest.current;
        const user = normalizeUser(data);
        if (!user) {
          throw new Error("No user returned.");
        }

        if (cancelled) {
          return;
        }

        clearSessionToken();
        setLocalUser(user);


        trackConversionEvent("sign_in_completed", { source: "oauth_complete" });
        window.location.replace(returnTo);
      } catch (error) {
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : "Sign in completed, but the session could not be confirmed. Please try again.");
        }
      }
    }

    void finishSignIn();

    return () => {
      cancelled = true;
    };
  }, [returnTo]);

  return (
    <main className="grid min-h-screen place-items-center bg-bg px-6 text-text">
      <section className="w-full max-w-md rounded border border-line bg-panel p-6 text-center shadow-panel">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded bg-indigo font-extrabold">VS</div>
        <h1 className="mb-3 text-2xl font-extrabold">VideoToSRT</h1>
        <p className="mb-0 text-sm font-semibold text-muted">{message}</p>
      </section>
    </main>
  );
}
