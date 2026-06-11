"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { LoginModal } from "@/components/modals/login-modal";
import { Button } from "@/components/ui/button";
import { api, type ApiUser } from "@/lib/api";
import { clearAuthToken, setLocalUser, useAuthUser } from "@/lib/auth";

function getUserInitial(user: ApiUser) {
  const label = user.name ?? user.email ?? "User";
  return label.trim().charAt(0).toUpperCase() || "U";
}

export function SiteNav({ active }: { active?: "home" | "pricing" | "editor" }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const auth = useAuthUser();
  const [logoutError, setLogoutError] = useState("");

  useEffect(() => {
    setUser(auth.user);
  }, [auth.user]);

  async function handleLogout() {
    setLogoutError("");
    try {
      await api.logout();
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : "Could not sign out. Please try again.");
    } finally {
      clearAuthToken();
      setLocalUser(null);
      setUser(null);
    }
  }

  const userLabel = user?.name ?? user?.email ?? "Account";
  const userEmail = user?.email ?? "No email available";
  const userAvatar = user?.avatar ?? user?.image;

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
            <div className="group relative">
              <button
                className="inline-flex min-h-[42px] max-w-[220px] items-center justify-center gap-2 rounded border border-line bg-white/[.03] px-3 text-sm font-bold text-text transition hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan"
                type="button"
                aria-haspopup="menu"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-white/[.03] text-xs font-extrabold text-soft">
                  {userAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="h-full w-full object-cover" src={userAvatar} alt="" />
                  ) : (
                    getUserInitial(user)
                  )}
                </span>
                <span className="hidden max-w-[130px] truncate sm:inline">{userLabel}</span>
                <ChevronDown className="h-4 w-4 shrink-0 text-soft" aria-hidden="true" />
              </button>
              <div className="absolute right-0 top-full z-50 hidden min-w-[220px] pt-2 group-hover:block group-focus-within:block">
                <div className="rounded border border-line bg-bg p-2 shadow-[0_18px_45px_rgba(0,0,0,.28)]">
                  <p className="mb-2 max-w-[220px] truncate border-b border-soft/20 px-2 pb-2 text-xs font-semibold text-soft">
                    {userEmail}
                  </p>
                  <button
                    className="flex w-full items-center rounded bg-white/[.03] px-3 py-2 text-left text-sm font-bold text-text transition hover:bg-white/[.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan"
                    type="button"
                    onClick={handleLogout}
                    role="menuitem"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          ) : auth.loading ? (
            <Button variant="secondary" type="button" disabled>Checking...</Button>
          ) : (
            <LoginModal trigger={<Button variant="secondary">Sign in</Button>} onLoginSuccess={setUser} />
          )}
          <Link className="inline-flex min-h-[42px] items-center justify-center rounded bg-indigo px-4 text-sm font-bold text-text shadow-[0_12px_30px_rgba(99,102,241,.22)] transition hover:-translate-y-px" href="/#upload">
            Upload Video - Free
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
