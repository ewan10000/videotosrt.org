"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { HomeUploadButton } from "@/components/home-upload-button";
import { LoginModal } from "@/components/modals/login-modal";
import { Button } from "@/components/ui/button";
import { api, type ApiUser } from "@/lib/api";
import {
  clearSessionToken,
  consumeSessionTokenFromLocation,
  getLocalUser,
  getUserDisplayName,
  normalizeUser,
  onAuthChange,
  setLocalUser
} from "@/lib/auth";
import { getExtraCreditLabel, getUserVipPlan, getVipBadgeClass, getVipLabel, mergeStoredMembership } from "@/lib/plans";

export function SiteNav({ active }: { active?: "home" | "pricing" | "editor" }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoutError, setLogoutError] = useState("");
  const vipPlan = getUserVipPlan(user);
  const extraCreditLabel = getExtraCreditLabel(user);

  useEffect(() => {
    let mounted = true;
    const removeAuthListener = onAuthChange((nextUser) => setUser(nextUser));
    consumeSessionTokenFromLocation();

    api
      .me()
      .then((data) => {
        if (!mounted) {
          return;
        }
        const nextUser = mergeStoredMembership(normalizeUser(data), getLocalUser());
        setLocalUser(nextUser);
        setUser(nextUser);
      })
      .catch(() => {
        if (mounted) {
          setLocalUser(null);
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
      clearSessionToken();
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
              <div className="hidden min-w-0 items-center gap-2 sm:flex">
                <span className="max-w-[160px] truncate text-sm font-bold text-soft">
                  {getUserDisplayName(user)}
                </span>
                <span className={`shrink-0 rounded border px-2 py-1 text-[11px] font-extrabold uppercase tracking-normal ${getVipBadgeClass(vipPlan)}`}>
                  {getVipLabel(vipPlan)}
                </span>
                {extraCreditLabel ? (
                  <span className="shrink-0 rounded border border-cyan/40 bg-cyan/10 px-2 py-1 text-[11px] font-extrabold uppercase tracking-normal text-cyan">
                    {extraCreditLabel}
                  </span>
                ) : null}
              </div>
              <Button variant="secondary" type="button" onClick={handleLogout}>Sign out</Button>
            </>
          ) : loading ? (
            <Button variant="secondary" type="button" disabled>Checking...</Button>
          ) : (
            <LoginModal trigger={<Button variant="secondary">Sign in</Button>} onLoginSuccess={setUser} />
          )}
          <HomeUploadButton className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded bg-indigo px-4 text-sm font-bold text-text shadow-[0_12px_30px_rgba(99,102,241,.22)] transition hover:-translate-y-px" />
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
