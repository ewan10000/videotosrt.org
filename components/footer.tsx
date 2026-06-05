import Link from "next/link";
import { Brand } from "@/components/brand";
import { ContactModal } from "@/components/modals/contact-modal";

export function Footer() {
  return (
    <footer className="border-t border-soft/15 py-8">
      <div className="site-container flex flex-wrap items-center justify-between gap-5">
        <Brand />
        <div className="flex flex-wrap gap-4 text-sm font-semibold text-soft">
          <Link href="/pricing">Pricing</Link>
          <Link href="/editor">Editor</Link>
          <Link href="/privacy-policy">Privacy</Link>
          <Link href="/terms-of-service">Terms</Link>
          <Link href="/dmca">DMCA</Link>
          <ContactModal
            trigger={
              <button className="cursor-pointer bg-transparent p-0 text-sm font-semibold text-soft" type="button">
                Contact
              </button>
            }
          />
        </div>
        <p className="mb-0 text-sm text-soft">© {new Date().getFullYear()} VideoToSRT. Made for creators who ship.</p>
      </div>
    </footer>
  );
}
