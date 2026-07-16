import type { Metadata, Viewport } from "next";
import type * as React from "react";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter"
});

export const metadata: Metadata = {
  metadataBase: new URL("https://videotosrt.org"),
  title: {
    default: "VideoToSRT — Online Subtitle Editor",
    template: "%s | VideoToSRT"
  },
  description:
    "Upload, transcribe, edit, and export subtitles in your browser. AI transcription, inline editor, and SRT, VTT, or TXT export.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" }
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
  },
  openGraph: {
    title: "VideoToSRT — Online Subtitle Editor",
    description: "Upload, transcribe, edit, and export subtitles in your browser. AI transcription, inline editor, and SRT, VTT, or TXT export.",
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
      <body className={`${inter.variable} min-h-screen font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
