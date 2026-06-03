"use client";

import type * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ExportFormat = "srt" | "vtt" | "txt" | "ass";

function parseTimestamp(value: string) {
  const normalized = value.trim().replace(",", ".");
  const parts = normalized.split(":");
  const secondsPart = parts.pop() ?? "0";
  const seconds = Number(secondsPart);
  const minutes = Number(parts.pop() ?? "0");
  const hours = Number(parts.pop() ?? "0");

  return ((Number.isFinite(hours) ? hours : 0) * 3600) + ((Number.isFinite(minutes) ? minutes : 0) * 60) + (Number.isFinite(seconds) ? seconds : 0);
}

function formatTimestamp(value: string, separator: "," | "." = ",") {
  const totalMilliseconds = Math.max(0, Math.round(parseTimestamp(value) * 1000));
  const hours = Math.floor(totalMilliseconds / 3600000);
  const minutes = Math.floor((totalMilliseconds % 3600000) / 60000);
  const seconds = Math.floor((totalMilliseconds % 60000) / 1000);
  const milliseconds = totalMilliseconds % 1000;

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}${separator}${milliseconds.toString().padStart(3, "0")}`;
}

function formatAssTimestamp(value: string) {
  const totalCentiseconds = Math.max(0, Math.round(parseTimestamp(value) * 100));
  const hours = Math.floor(totalCentiseconds / 360000);
  const minutes = Math.floor((totalCentiseconds % 360000) / 6000);
  const seconds = Math.floor((totalCentiseconds % 6000) / 100);
  const centiseconds = totalCentiseconds % 100;

  return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${centiseconds.toString().padStart(2, "0")}`;
}

function buildPreview(format: ExportFormat, subtitles?: string[][]) {
  if (!subtitles?.length) {
    return "Upload and transcribe a video to see export preview.";
  }

  if (format === "srt") {
    return subtitles
      .map(([start = "", end = "", text = ""], index) => `${index + 1}\n${formatTimestamp(start)} --> ${formatTimestamp(end)}\n${text}`)
      .join("\n\n");
  }

  if (format === "vtt") {
    return `WEBVTT\n\n${subtitles
      .map(([start = "", end = "", text = ""]) => `${formatTimestamp(start, ".")} --> ${formatTimestamp(end, ".")}\n${text}`)
      .join("\n\n")}`;
  }

  if (format === "txt") {
    return subtitles.map(([, , text = ""]) => text).join("\n");
  }

  return `[Script Info]
Title: VideoToSRT subtitles
ScriptType: v4.00+

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,20,&H00FFFFFF,&H000000FF,&H00000000,&H64000000,0,0,0,0,100,100,0,0,1,2,0,2,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${subtitles.map(([start = "", end = "", text = ""]) => `Dialogue: 0,${formatAssTimestamp(start)},${formatAssTimestamp(end)},Default,,0,0,0,,${text.replace(/\n/g, "\\N")}`).join("\n")}`;
}

function getBaseFilename(filename?: string) {
  const cleanName = filename?.trim() || "subtitles";
  return cleanName.replace(/\.[^/.]+$/, "") || "subtitles";
}

export function ExportModal({ trigger, subtitles, filename }: { trigger: React.ReactNode; subtitles?: string[][]; filename?: string }) {
  const [format, setFormat] = useState<ExportFormat>("srt");
  const baseFilename = useMemo(() => getBaseFilename(filename), [filename]);
  const preview = useMemo(() => buildPreview(format, subtitles), [format, subtitles]);
  const [outputFilename, setOutputFilename] = useState(`${baseFilename}-subtitles.${format}`);

  useEffect(() => {
    setOutputFilename(`${baseFilename}-subtitles.${format}`);
  }, [baseFilename, format]);

  function downloadExport() {
    const blob = new Blob([preview], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = outputFilename.trim() || `${baseFilename}-subtitles.${format}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="w-[min(94vw,640px)]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-extrabold">Export subtitles</DialogTitle>
          <DialogDescription className="text-sm leading-6 text-muted">
            Choose a file format and export settings. Sign in is requested only at download.
          </DialogDescription>
        </DialogHeader>
        <Tabs value={format} onValueChange={(value) => setFormat(value as ExportFormat)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="srt">SRT</TabsTrigger>
            <TabsTrigger value="vtt">VTT</TabsTrigger>
            <TabsTrigger value="txt">TXT</TabsTrigger>
            <TabsTrigger value="ass">ASS</TabsTrigger>
          </TabsList>
          {(["srt", "vtt", "txt", "ass"] as const).map((tabFormat) => (
            <TabsContent key={tabFormat} value={tabFormat} className="mt-4">
              <pre className="max-h-64 overflow-auto rounded border border-line bg-panel-2 p-4 font-mono text-xs leading-5 text-soft whitespace-pre-wrap">
                {preview}
              </pre>
            </TabsContent>
          ))}
        </Tabs>
        <div className="grid gap-3 py-4 sm:grid-cols-2">
          {["Include speaker labels", "Normalize timestamps", "Keep line breaks", "UTF-8 encoding"].map((item) => (
            <label key={item} className="flex min-h-12 items-center gap-3 rounded border border-line bg-panel-2 px-3 text-sm font-semibold">
              <input type="checkbox" defaultChecked className="h-4 w-4 accent-cyan" />
              {item}
            </label>
          ))}
        </div>
        <label className="grid gap-2 text-sm font-bold">
          File name
          <input
            className="min-h-11 rounded border border-line bg-panel-2 px-3 text-text outline-none focus:border-cyan"
            value={outputFilename}
            onChange={(event) => setOutputFilename(event.target.value)}
          />
        </label>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Button variant="secondary" className="gap-2 sm:flex-1">
            <FileText className="h-4 w-4" />
            Preview file
          </Button>
          <Button variant="primary" className="gap-2 sm:flex-1" type="button" onClick={downloadExport}>
            <Download className="h-4 w-4" />
            Download
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
