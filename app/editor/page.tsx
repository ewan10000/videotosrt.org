import type { Metadata } from "next";
import { EditorClient } from "@/components/sections/editor-client";

export const metadata: Metadata = {
  title: "Subtitle Editor",
  description: "VideoToSRT desktop subtitle editor for reviewing, timing, editing, and exporting subtitle rows.",
  alternates: { canonical: "/editor" }
};

export default function EditorPage() {
  return <EditorClient />;
}
