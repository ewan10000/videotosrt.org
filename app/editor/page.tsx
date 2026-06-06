import { EditorClient } from "@/components/sections/editor-client";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  path: "/editor",
  title: "Subtitle Editor",
  description: "VideoToSRT desktop subtitle editor for reviewing, timing, editing, and exporting subtitle rows."
});

export default function EditorPage() {
  return <EditorClient />;
}
