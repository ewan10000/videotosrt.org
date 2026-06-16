"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch, type ApiUserResponse } from "@/lib/api";
import { normalizeUser, setLocalUser } from "@/lib/auth";

const UPSTREAM_API_BASE = "https://videotosrt-backend.ewan0862.workers.dev/api";

function safeReturnTo(value: string | null) {
  if (!value) {
    return "/";
  }

  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin) {
      return "/";
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}

export function AuthBridgeClient() {
  const [message, setMessage] = useState("Finishing sign in...");
  const returnTo = useMemo(() => {
    if (typeof window === "undefined") {
      return "/";
    }

    return safeReturnTo(new URLSearchParams(window.location.search).get("returnTo"));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bridgeOAuthSession() {
      try {
        const upstreamResponse = await fetch(`${UPSTREAM_API_BASE}/auth/me`, {
          credentials: "include",
          headers: {
            Accept: "application/json"
          }
        });

        if (!upstreamResponse.ok) {
          throw new Error("The OAuth session was not available yet.");
        }

        const upstreamData = await upstreamResponse.json() as ApiUserResponse;
        const upstreamUser = normalizeUser(upstreamData);
        if (!upstreamUser?.email) {
          throw new Error("The OAuth provider did not return an email address.");
        }

        const bridgedData = await apiFetch<ApiUserResponse>("/auth/oauth/bridge", {
          body: upstreamUser,
          method: "POST"
        });
        const user = normalizeUser(bridgedData) ?? upstreamUser;

        if (cancelled) {
          return;
        }

        setLocalUser(user);
        window.location.replace(returnTo);
      } catch {
        if (!cancelled) {
          setMessage("Sign in did not complete. Please try again.");
        }
      }
    }

    void bridgeOAuthSession();

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
