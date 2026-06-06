import type { Metadata } from "next";
import { EditorClient } from "@/components/sections/editor-client";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";

export const metadata: Metadata = {
  title: "Subtitle Editor",
  description: "VideoToSRT desktop subtitle editor for reviewing, timing, editing, and exporting subtitle rows.",
  alternates: { canonical: "/editor" },
  robots: { index: false, follow: true }
};

export default function EditorPage() {
  return (
    <>
      <Breadcrumbs items={[{ label: "Editor", href: "/editor" }]} />
      <EditorClient />
    </>
  );
}
