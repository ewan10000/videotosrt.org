"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { LoginModal } from "@/components/modals/login-modal";
import { Button } from "@/components/ui/button";
import { api, type ApiUser } from "@/lib/api";
import { getLocalUser, normalizeUser, onAuthChange, setLocalUser } from "@/lib/auth";

export function SiteNav({ active }: { active?: "home" | "pricing" | "editor" }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoutError, setLogoutError] = useState("");

  useEffect(() => {
    let mounted = true;
    const removeAuthListener = onAuthChange((nextUser) => setUser(nextUser));

    setUser(getLocalUser());
    api
      .me()
      .then((data) => {
        if (!mounted) {
          return;
        }
        setUser(normalizeUser(data) ?? getLocalUser());
      })
      .catch(() => {
        if (mounted) {
          setUser(null);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
      removeAuthListener();
    };
  }, []);

  async function handleLogout() {
    const localUser = getLocalUser();
    setLogoutError("");
    try {
      await api.logout();
    } catch (error) {
      if (!localUser) {
        setLogoutError(error instanceof Error ? error.message : "Could not sign out. Please try again.");
      }
    } finally {
      setLocalUser(null);
      setUser(null);
    }
  }

  return (
    <nav className="sticky top-0 z-40 border-b border-soft/20 bg-bg/95">
      <div className="site-container flex min-h-[72px] items-center justify-between gap-6">
        <Brand />
        <div className="hidden items-center gap-7 md:flex" aria-label="Primary navigation">
          <Link className="nav-link" href="/#features">Features</Link>
          <Link className="nav-link" href="/editor">Editor</Link>
          <Link className={active === "pricing" ? "text-text nav-link" : "nav-link"} href="/pricing">Pricing</Link>
          <Link className="nav-link" href="/#faq">FAQ</Link>
        </div>
        <div className="flex items-center gap-2.5">
          {user ? (
            <>
              <span className="hidden max-w-[180px] truncate text-sm font-bold text-soft sm:inline">
                {user.name ?? user.email ?? "Signed in"}
              </span>
              <Button variant="secondary" type="button" onClick={handleLogout}>Sign out</Button>
            </>
          ) : loading ? (
            <Button variant="secondary" type="button" disabled>Checking...</Button>
          ) : (
            <LoginModal trigger={<Button variant="secondary">Sign in</Button>} onLoginSuccess={setUser} />
          )}
          <Link className="inline-flex min-h-[42px] items-center justify-center rounded bg-indigo px-4 text-sm font-bold text-text shadow-[0_12px_30px_rgba(99,102,241,.22)] transition hover:-translate-y-px" href="/#upload">
            Start free
          </Link>
        </div>
      </div>
      {logoutError ? (
        <div className="site-container pb-3">
          <p className="mb-0 flex items-center justify-end gap-3 text-sm font-semibold text-red-300">
            <span>{logoutError}</span>
            <button className="text-xs font-extrabold text-red-200 underline underline-offset-2" type="button" onClick={() => setLogoutError("")}>
              Close
            </button>
          </p>
        </div>
      ) : null}
    </nav>
  );
}
