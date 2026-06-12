"use client";

import type * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { Download, Eye } from "lucide-react";
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
import type { ApiUser } from "@/lib/api";
import { canUseStyledExport, getUserVipPlan, getVipBadgeClass, getVipLabel } from "@/lib/plans";

type ExportFormat = "srt" | "vtt" | "txt" | "ass";
type ExportOptions = {
  includeSpeakerLabels: boolean;
  normalizeTimestamps: boolean;
  keepLineBreaks: boolean;
  utf8Encoding: boolean;
};

const defaultExportOptions: ExportOptions = {
  includeSpeakerLabels: true,
  normalizeTimestamps: true,
  keepLineBreaks: true,
  utf8Encoding: true
};

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

function getTimestamp(value: string, normalize: boolean, separator: "," | "." = ",") {
  return normalize ? formatTimestamp(value, separator) : value.trim();
}

function stripSpeakerLabel(text: string) {
  return text.replace(/^(\s*(speaker\s*\d*|[a-z][\w .-]{0,32})\s*:\s*)/i, "");
}

function formatSubtitleText(text: string, options: ExportOptions, format: ExportFormat) {
  const withoutSpeaker = options.includeSpeakerLabels ? text : stripSpeakerLabel(text);
  const withLineBreaks = options.keepLineBreaks ? withoutSpeaker : withoutSpeaker.replace(/\s*\n+\s*/g, " ");

  if (format === "ass") {
    return withLineBreaks.replace(/\n/g, "\\N");
  }

  return withLineBreaks;
}

function buildOutput(format: ExportFormat, subtitles: string[][] | undefined, options: ExportOptions) {
  const usableSubtitles = subtitles?.filter(([, , text = ""]) => text.trim().length > 0) ?? [];

  if (!usableSubtitles.length) {
    return "Upload and transcribe a video to see export preview.";
  }

  if (format === "srt") {
    return usableSubtitles
      .map(
        ([start = "", end = "", text = ""], index) =>
          `${index + 1}\n${getTimestamp(start, options.normalizeTimestamps)} --> ${getTimestamp(end, options.normalizeTimestamps)}\n${formatSubtitleText(text, options, format)}`
      )
      .join("\n\n");
  }

  if (format === "vtt") {
    return `WEBVTT\n\n${usableSubtitles
      .map(
        ([start = "", end = "", text = ""]) =>
          `${getTimestamp(start, options.normalizeTimestamps, ".")} --> ${getTimestamp(end, options.normalizeTimestamps, ".")}\n${formatSubtitleText(text, options, format)}`
      )
      .join("\n\n")}`;
  }

  if (format === "txt") {
    return usableSubtitles
      .map(([start = "", end = "", text = ""]) => {
        const body = formatSubtitleText(text, options, format);
        if (!options.normalizeTimestamps) {
          return body;
        }

        return `[${getTimestamp(start, true, ".")} - ${getTimestamp(end, true, ".")}]\n${body}`;
      })
      .join(options.keepLineBreaks ? "\n\n" : "\n");
  }

  return `[Script Info]
Title: VideoToSRT subtitles
ScriptType: v4.00+

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,20,&H00FFFFFF,&H000000FF,&H00000000,&H64000000,0,0,0,0,100,100,0,0,1,2,0,2,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${usableSubtitles.map(([start = "", end = "", text = ""]) => `Dialogue: 0,${options.normalizeTimestamps ? formatAssTimestamp(start) : start},${options.normalizeTimestamps ? formatAssTimestamp(end) : end},Default,,0,0,0,,${formatSubtitleText(text, options, format)}`).join("\n")}`;
}

function getBaseFilename(filename?: string) {
  const cleanName = filename?.trim() || "subtitles";
  return cleanName.replace(/\.[^/.]+$/, "") || "subtitles";
}

export function ExportModal({ trigger, subtitles, filename, user }: { trigger: React.ReactNode; subtitles?: string[][]; filename?: string; user?: ApiUser | null }) {
  const [format, setFormat] = useState<ExportFormat>("srt");
  const [options, setOptions] = useState<ExportOptions>(defaultExportOptions);
  const baseFilename = useMemo(() => getBaseFilename(filename), [filename]);
  const preview = useMemo(() => buildOutput(format, subtitles, options), [format, options, subtitles]);
  const previewSettings = useMemo(
    () => [
      options.includeSpeakerLabels ? "Speaker labels included" : "Speaker labels removed when detected",
      options.normalizeTimestamps ? "Timestamps normalized" : "Original timestamps kept",
      options.keepLineBreaks ? "Line breaks kept" : "Line breaks flattened",
      options.utf8Encoding ? "UTF-8 BOM enabled for download" : "Plain text download"
    ],
    [options]
  );
  const [outputFilename, setOutputFilename] = useState(`${baseFilename}-subtitles.${format}`);
  const vipPlan = getUserVipPlan(user);
  const canExportStyled = canUseStyledExport(user);
  const selectedFormatLocked = format === "ass" && !canExportStyled;

  useEffect(() => {
    setOutputFilename(`${baseFilename}-subtitles.${format}`);
  }, [baseFilename, format]);

  function updateOption(key: keyof ExportOptions, value: boolean) {
    setOptions((currentOptions) => ({ ...currentOptions, [key]: value }));
  }

  function createOutputBlob() {
    const body = options.utf8Encoding ? `\uFEFF${preview}` : preview;
    return new Blob([body], { type: options.utf8Encoding ? "text/plain;charset=utf-8" : "text/plain" });
  }

  function downloadExport() {
    if (selectedFormatLocked) {
      return;
    }

    const blob = createOutputBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = outputFilename.trim() || `${baseFilename}-subtitles.${format}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="flex h-[min(88vh,720px)] w-[min(94vw,680px)] flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-2xl font-extrabold">Export subtitles</DialogTitle>
          <DialogDescription className="text-sm leading-6 text-muted">
            Choose a file format and export settings.
          </DialogDescription>
        </DialogHeader>
        <Tabs value={format} onValueChange={(value) => setFormat(value as ExportFormat)} className="shrink-0">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="srt">SRT</TabsTrigger>
            <TabsTrigger value="vtt">VTT</TabsTrigger>
            <TabsTrigger value="txt">TXT</TabsTrigger>
            <TabsTrigger value="ass" disabled={!canExportStyled}>ASS Pro</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded border border-line bg-panel-2 px-3 py-2 text-sm font-semibold">
          <span className="text-soft">Current membership</span>
          <span className={`rounded border px-2 py-1 text-[11px] font-extrabold uppercase tracking-normal ${getVipBadgeClass(vipPlan)}`}>
            {getVipLabel(vipPlan)}
          </span>
        </div>
        {!canExportStyled ? (
          <p className="mb-0 shrink-0 rounded border border-cyan/30 bg-cyan/10 px-3 py-2 text-sm font-semibold text-cyan">
            ASS styled export is unlocked for Pro and Studio VIP users. <a className="underline underline-offset-4" href="/pricing">Upgrade on pricing</a>.
          </p>
        ) : null}
        <div className="grid shrink-0 gap-3 py-4 sm:grid-cols-2">
          {[
            ["includeSpeakerLabels", "Include speaker labels"],
            ["normalizeTimestamps", "Normalize timestamps"],
            ["keepLineBreaks", "Keep line breaks"],
            ["utf8Encoding", "UTF-8 encoding"]
          ].map(([key, label]) => (
            <label key={key} className="flex min-h-12 items-center gap-3 rounded border border-line bg-panel-2 px-3 text-sm font-semibold">
              <input
                type="checkbox"
                checked={options[key as keyof ExportOptions]}
                className="h-4 w-4 accent-cyan"
                onChange={(event) => updateOption(key as keyof ExportOptions, event.target.checked)}
              />
              {label}
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
        <div className="mt-5 flex shrink-0 flex-col gap-3 sm:flex-row">
          <div className="flex min-h-[42px] items-center gap-2 rounded border border-line bg-panel-2 px-4 text-sm font-bold text-soft sm:flex-1">
            <Eye className="h-4 w-4 text-cyan" />
            Live preview updates as settings change
          </div>
          <Button variant="primary" className="gap-2 sm:flex-1" type="button" onClick={downloadExport} disabled={selectedFormatLocked}>
            <Download className="h-4 w-4" />
            Download
          </Button>
        </div>
        <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded border border-line bg-panel-2">
          <div className="flex flex-wrap gap-2 border-b border-line p-3">
            {previewSettings.map((setting) => (
              <span key={setting} className="rounded border border-cyan/30 bg-cyan/10 px-2 py-1 text-[11px] font-extrabold uppercase tracking-normal text-cyan">
                {setting}
              </span>
            ))}
          </div>
          <pre className="min-h-[160px] flex-1 overflow-auto p-4 font-mono text-xs leading-5 text-soft whitespace-pre-wrap">
            {preview}
          </pre>
        </div>
      </DialogContent>
    </Dialog>
  );
}
