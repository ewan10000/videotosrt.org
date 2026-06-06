import type { Metadata, Viewport } from "next";
import type * as React from "react";
import { Inter, JetBrains_Mono } from "next/font/google";
import { CookieBanner } from "@/components/cookie-banner";
import { Analytics } from "@/components/seo/analytics";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter"
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jetbrains"
});

export const metadata: Metadata = {
  metadataBase: new URL("https://videotosrt.org"),
  title: {
    default: "VideoToSRT — Online Subtitle Editor",
    template: "%s | VideoToSRT"
  },
  description:
    "Upload, edit, and export subtitles in your browser. AI transcription + inline editor. SRT, VTT, ASS. No software, no sign-up.",
  robots: { index: true, follow: true },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" }
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
  },
  openGraph: {
    title: "VideoToSRT — Online Subtitle Editor",
    description: "Upload, edit, and export subtitles in your browser. AI transcription + inline editor. SRT, VTT, ASS. No software, no sign-up.",
    url: "https://videotosrt.org",
    siteName: "VideoToSRT",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "VideoToSRT" }],
    locale: "en_US",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "VideoToSRT — Online Subtitle Editor",
    description: "AI transcription, inline subtitle editing, and clean SRT/VTT/TXT export.",
    images: ["/og-image.png"]
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0F172A"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://api.videotosrt.org" />
        <link rel="dns-prefetch" href="https://api.videotosrt.org" />
        <link rel="preconnect" href="https://plausible.io" />
        <link rel="dns-prefetch" href="https://plausible.io" />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="alternate" href="https://videotosrt.org/" {...{ hreflang: "x-default" }} />
      </head>
      <body className={`${inter.variable} ${jetbrains.variable} min-h-screen font-sans antialiased`}>
        {children}
        <CookieBanner />
        <Analytics />
      </body>
    </html>
  );
}
