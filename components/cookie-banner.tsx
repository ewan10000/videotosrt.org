"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const CONSENT_KEY = "cookie-consent";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(localStorage.getItem(CONSENT_KEY) !== "accepted");
  }, []);

  function acceptCookies() {
    localStorage.setItem(CONSENT_KEY, "accepted");
    setVisible(false);
  }

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#1a1a2e]/95 px-4 py-4 shadow-[0_-18px_48px_rgba(0,0,0,.35)] backdrop-blur">
      <div className="mx-auto flex w-[min(1180px,100%)] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="mb-0 text-sm leading-6 text-white/80">
          We use cookies to enhance your experience and analyze site traffic. By clicking Accept, you consent to our use of cookies.{" "}
          <Link className="font-semibold text-[#5eead4] underline underline-offset-4" href="/privacy-policy">Privacy Policy</Link>
        </p>
        <button
          className="min-h-11 shrink-0 rounded bg-[#5eead4] px-5 text-sm font-extrabold text-[#0f172a] transition hover:bg-[#99f6e4]"
          type="button"
          onClick={acceptCookies}
        >
          Accept
        </button>
      </div>
    </div>
  );
}
