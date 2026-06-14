import { EditorClient } from "@/components/sections/editor-client";
import { createPageJsonLd, createPageMetadata } from "@/lib/metadata";
import { JsonLd } from "@/components/seo/json-ld";

export const metadata = createPageMetadata({
  path: "/editor",
  title: "Subtitle Editor",
  description: "VideoToSRT desktop subtitle editor for reviewing, timing, editing, and exporting subtitle rows."
});
const pageJsonLd = createPageJsonLd({
  path: "/editor",
  name: "Subtitle Editor",
  description: "VideoToSRT desktop subtitle editor for reviewing, timing, editing, and exporting subtitle rows."
});


export default function EditorPage() {
  return (
    <>
      <JsonLd data={pageJsonLd} />
      <EditorClient />
    </>
  );
}
