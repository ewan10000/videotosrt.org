import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/footer";
import { SiteNav } from "@/components/site-nav";

export const metadata: Metadata = {
  title: { absolute: "Page Not Found | VideoToSRT" },
  description: "The requested VideoToSRT page could not be found.",
  robots: { index: false, follow: true },
  openGraph: {
    title: "Page Not Found | VideoToSRT",
    description: "The requested VideoToSRT page could not be found.",
    url: "https://videotosrt.org/404",
    siteName: "VideoToSRT",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "VideoToSRT" }],
    locale: "en_US",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Page Not Found | VideoToSRT",
    description: "The requested VideoToSRT page could not be found.",
    images: ["/og-image.png"]
  }
};

export default function NotFound() {
  return (
    <>
      <SiteNav />
      <main className="site-container grid min-h-[60vh] place-items-center py-16 text-center">
        <section className="max-w-xl">
          <span className="eyebrow"><span className="dot" /> 404</span>
          <h1 className="mb-4 mt-5 text-[clamp(38px,6vw,60px)] font-extrabold leading-none">Page Not Found</h1>
          <p className="mb-7 leading-7 text-muted">The page you requested does not exist or has moved.</p>
          <Link className="inline-flex min-h-[42px] items-center justify-center rounded bg-indigo px-4 text-sm font-bold text-text" href="/">
            Go Home
          </Link>
        </section>
      </main>
      <Footer />
    </>
  );
}
