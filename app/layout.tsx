import type { Metadata, Viewport } from "next";
import type * as React from "react";
import { Inter, JetBrains_Mono } from "next/font/google";
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
    default: "VideoToSRT | AI Subtitle Editor",
    template: "%s | VideoToSRT"
  },
  description:
    "Generate, edit, and export accurate SRT subtitles from video in your browser. No sign-up required until export.",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" }
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
  },
  openGraph: {
    title: "VideoToSRT | AI Subtitle Editor",
    description: "Upload, edit, and export production-ready subtitles in one browser workflow.",
    url: "https://videotosrt.org",
    siteName: "VideoToSRT",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    locale: "en_US",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "VideoToSRT | AI Subtitle Editor",
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
      <body className={`${inter.variable} ${jetbrains.variable} min-h-screen font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
