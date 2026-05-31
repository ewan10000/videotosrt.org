"use client";

import { useMemo, useState } from "react";
import { Pause, Play, Save, SkipBack, SkipForward } from "lucide-react";
import { Brand } from "@/components/brand";
import { ExportModal } from "@/components/modals/export-modal";
import { Button } from "@/components/ui/button";

const initialSubtitles = [
  ["00:00:00.000", "00:00:02.180", "Welcome back. Today we are converting video speech into SRT."],
  ["00:00:02.180", "00:00:04.720", "The first pass gives us accurate timestamps and editable text."],
  ["00:00:04.720", "00:00:07.460", "Let us turn this video into clean subtitles."],
  ["00:00:07.460", "00:00:10.120", "You can review each segment and adjust timing where needed."],
  ["00:00:10.120", "00:00:13.300", "This row is open for direct subtitle editing."],
  ["00:00:13.300", "00:00:16.080", "Shortcuts keep the editing flow fast and predictable."],
  ["00:00:16.080", "00:00:19.640", "The preview updates as you move across the timeline."],
  ["00:00:19.640", "00:00:22.960", "Export creates a standard subtitle file for your player."],
  ["00:00:22.960", "00:00:26.420", "Save your draft before switching projects."],
  ["00:00:26.420", "00:00:30.000", "VideoToSRT keeps the transcript and timing in one focused workspace."]
];

export function EditorClient() {
  const [playing, setPlaying] = useState(false);
  const [active, setActive] = useState(2);
  const rows = useMemo(() => initialSubtitles, []);

  return (
    <>
      <div className="hidden min-h-screen min-w-[760px] grid-rows-[64px_1fr_36px] bg-bg text-text min-[760px]:grid">
        <header className="flex items-center justify-between border-b border-line bg-panel px-4">
          <Brand />
          <div className="font-mono text-sm font-bold text-cyan" aria-label="Current time">00:00:05.240</div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="icon" type="button" aria-label="Play or pause" onClick={() => setPlaying((value) => !value)}>
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <ExportModal trigger={<Button variant="secondary">Export</Button>} />
            <Button variant="primary" className="gap-2"><Save className="h-4 w-4" /> Save</Button>
          </div>
        </header>
        <main className="grid min-h-0 grid-cols-[60%_40%] max-[1100px]:grid-cols-1">
          <section className="grid min-h-0 grid-rows-[1fr_auto] border-r border-line bg-[#101A2E] p-5 max-[1100px]:border-b max-[1100px]:border-r-0" aria-label="Video editor">
            <div className="relative grid min-h-[320px] place-items-center overflow-hidden rounded border border-line bg-bg">
              <div className="absolute inset-0 [background:radial-gradient(circle_at_30%_20%,rgba(99,102,241,.25),transparent_30%),linear-gradient(135deg,rgba(34,211,238,.12),transparent_45%)]" />
              <button className="relative grid h-[68px] w-[68px] place-items-center rounded-full bg-indigo text-xl" type="button" aria-label="Play video" onClick={() => setPlaying((value) => !value)}>
                {playing ? "Ⅱ" : "▶"}
              </button>
              <div className="absolute bottom-8 max-w-[70%] rounded bg-black/60 px-4 py-2 text-center text-lg font-extrabold">
                {rows[active][2]}
              </div>
            </div>
            <div className="mt-5">
              <div className="grid grid-cols-[92px_1fr_104px] items-center gap-3" aria-label="Timeline scrubber">
                <span className="font-mono text-xs text-soft">00:00:00.000</span>
                <div className="relative h-3 rounded-full bg-[#24324B]">
                  <div className="h-full w-[34%] rounded-full bg-cyan">
                    <span className="absolute left-[34%] top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border-4 border-bg bg-cyan" />
                  </div>
                </div>
                <span className="font-mono text-xs text-soft">00:04:32.000</span>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex gap-2">
                  <Button variant="secondary" size="icon" aria-label="Skip backward"><SkipBack className="h-4 w-4" /></Button>
                  <Button variant="secondary" size="icon" aria-label="Skip forward"><SkipForward className="h-4 w-4" /></Button>
                </div>
                <span className="text-sm font-semibold text-soft">Whisper EN · 42 subtitles · autosaved</span>
              </div>
            </div>
          </section>
          <aside className="grid min-h-0 grid-rows-[62px_1fr] bg-panel" aria-label="Subtitle table">
            <div className="flex items-center justify-between border-b border-line px-5">
              <h1 className="mb-0 text-xl font-extrabold">Subtitles</h1>
              <span className="text-sm font-bold text-soft">42 items</span>
            </div>
            <div className="min-h-0 overflow-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="sticky top-0 z-10 bg-panel-2 text-xs uppercase tracking-normal text-soft">
                  <tr>
                    <th className="w-12 border-b border-line px-3 py-3">#</th>
                    <th className="w-[190px] border-b border-line px-3 py-3">Start-End</th>
                    <th className="border-b border-line px-3 py-3">Text</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(([start, end, text], index) => (
                    <tr
                      key={`${start}-${end}`}
                      className={`cursor-pointer border-b border-line/70 ${active === index ? "bg-cyan/10" : "hover:bg-panel-2"}`}
                      onClick={() => setActive(index)}
                    >
                      <td className="px-3 py-3 text-soft">{index + 1}</td>
                      <td className="px-3 py-3 font-mono text-xs text-cyan">
                        {index === 4 ? (
                          <div className="grid gap-2">
                            <input className="rounded border border-line bg-bg px-2 py-1 text-cyan outline-none focus:border-cyan" defaultValue={start} aria-label="Start time row 5" />
                            <input className="rounded border border-line bg-bg px-2 py-1 text-cyan outline-none focus:border-cyan" defaultValue={end} aria-label="End time row 5" />
                          </div>
                        ) : `${start} - ${end}`}
                      </td>
                      <td className="px-3 py-3 text-muted">
                        {index === 4 ? (
                          <input className="min-h-10 w-full rounded border border-line bg-bg px-3 text-text outline-none focus:border-cyan" defaultValue={text} aria-label="Subtitle text row 5" />
                        ) : text}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </aside>
        </main>
        <footer className="flex items-center gap-5 border-t border-line bg-panel px-4 text-xs font-semibold text-soft">
          <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-success" />Ready</span>
          <span>42 subtitles</span>
          <span><span className="font-mono text-cyan">4:32</span> duration</span>
          <span>Whisper EN</span>
        </footer>
      </div>
      <div className="grid min-h-screen place-items-center bg-bg p-6 min-[760px]:hidden">
        <div className="max-w-md rounded border border-line bg-panel p-6 text-center shadow-panel">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded bg-indigo font-extrabold">VS</div>
          <h1 className="mb-3 text-2xl font-extrabold">Editor requires a wider screen.</h1>
          <p className="mb-5 leading-6 text-muted">The MVP subtitle editor is built for desktop workflows with a minimum width of 760px.</p>
          <Button variant="primary" onClick={() => history.back()}>Go back</Button>
        </div>
      </div>
    </>
  );
}
