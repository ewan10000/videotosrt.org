import { EditorClient } from "@/components/sections/editor-client";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  path: "/editor",
  title: "Subtitle Editor",
  description: "VideoToSRT desktop subtitle editor for reviewing, timing, editing, and exporting subtitle rows."
});

export default function EditorPage() {
  return (
    <>
      <Breadcrumbs items={[{ label: "Editor", href: "/editor" }]} />
      <h1 className="sr-only">Online Subtitle Editor</h1>
      <EditorClient />
    </>
  );
}
