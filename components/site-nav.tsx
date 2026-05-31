import Link from "next/link";
import { Brand } from "@/components/brand";
import { LoginModal } from "@/components/modals/login-modal";
import { Button } from "@/components/ui/button";

export function SiteNav({ active }: { active?: "home" | "pricing" | "editor" }) {
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
          <LoginModal trigger={<Button variant="secondary">Sign in</Button>} />
          <Link className="inline-flex min-h-[42px] items-center justify-center rounded bg-indigo px-4 text-sm font-bold text-text shadow-[0_12px_30px_rgba(99,102,241,.22)] transition hover:-translate-y-px" href="/#upload">
            Start free
          </Link>
        </div>
      </div>
    </nav>
  );
}
