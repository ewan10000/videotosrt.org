"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { consumeSessionTokenFromLocation, normalizeUser, setLocalUser } from "@/lib/auth";

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

export function AuthCompleteClient() {
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
      const consumed = consumeSessionTokenFromLocation();
      if (!consumed) {
        setMessage("Sign in did not return a session. Please try again.");
        return;
      }

      try {
        const data = await api.me();
        const user = normalizeUser(data);
        if (!user) {
          throw new Error("No user returned.");
        }

        if (cancelled) {
          return;
        }

        setLocalUser(user);
        window.location.replace(returnTo);
      } catch {
        if (!cancelled) {
          setMessage("Sign in completed, but the session could not be confirmed. Please try again.");
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
