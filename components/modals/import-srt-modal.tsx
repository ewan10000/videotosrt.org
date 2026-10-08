"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { parseSrt, readSrtFile, type SubtitleRow } from "@/lib/srt";

export function ImportSrtModal({ onImport, disabled }: { onImport: (rows: SubtitleRow[]) => void; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);

  function load(rows: SubtitleRow[]) {
    onImport(rows);
    setError("");
    setText("");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={(value) => { setOpen(value); setError(""); }}>
      <DialogTrigger asChild><Button variant="secondary" size="sm" type="button" disabled={disabled}>Import SRT</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import existing SRT</DialogTitle>
          <DialogDescription>Replace subtitle rows with an SRT file or pasted text. Media stays loaded. This runs locally and uses no transcription quota.</DialogDescription>
        </DialogHeader>
        <label className="grid gap-2 text-sm font-semibold">
          UTF-8 SRT file
          <input type="file" accept=".srt" disabled={reading} onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            setReading(true);
            setError("");
            try { load(await readSrtFile(file)); }
            catch (error) { setError(error instanceof Error ? error.message : "Could not import SRT."); }
            finally { setReading(false); }
          }} />
        </label>
        <label className="mt-4 grid gap-2 text-sm font-semibold">
          Paste SRT text
          <textarea className="h-48 w-full rounded border border-line bg-bg p-3 font-mono text-sm" value={text} onChange={(event) => setText(event.target.value)} />
        </label>
        {error ? <p role="alert" className="mt-3 text-sm text-red-300">{error}</p> : null}
        <Button className="mt-4" type="button" disabled={reading} onClick={() => {
          try { load(parseSrt(text)); }
          catch (error) { setError(error instanceof Error ? error.message : "Could not import SRT."); }
        }}>Load pasted SRT</Button>
      </DialogContent>
    </Dialog>
  );
}
