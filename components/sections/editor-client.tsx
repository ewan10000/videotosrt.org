"use client";

import type * as React from "react";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, FileVideo, Pause, Play, Plus, Save, Trash2 } from "lucide-react";
import { Brand } from "@/components/brand";
import { ExportModal } from "@/components/modals/export-modal";
import { LoginModal } from "@/components/modals/login-modal";
import { Button } from "@/components/ui/button";
import { api, type ApiJob, type ApiUser, type UploadResponse } from "@/lib/api";
import { getLocalUser, normalizeUser, onAuthChange, setLocalUser } from "@/lib/auth";
import { getExtraCreditLabel, getUserVipPlan, getVipBadgeClass, getVipLabel, mergeStoredMembership } from "@/lib/plans";
import { getPendingUpload, deletePendingUpload } from "@/lib/upload-transfer";

type SubtitleRow = [string, string, string];
type EditorDraft = {
  duration?: number;
  fileSize?: number | null;
  filename?: string;
  rows?: SubtitleRow[];
  savedAt?: string;
};

const EDITOR_DRAFT_KEY = "videotosrt.editor.draft";
const EDITOR_JOB_KEY = "videotosrt.editor.job";
const UPLOAD_META_KEY = "videotosrt.upload";
const MAX_TRANSCRIPTION_UPLOAD_BYTES = 25 * 1024 * 1024;
const MAX_JOB_POLL_ATTEMPTS = 240;
const JOB_FAST_POLL_INTERVAL_MS = 2000;
const JOB_SLOW_POLL_INTERVAL_MS = 5000;
const SUBTITLES_PER_PAGE = 8;
const CAPTION_POSITION_KEY = "videotosrt.editor.captionPosition";

function readMediaDuration(url: string, type: string) {
  return new Promise<number>((resolve) => {
    const media = document.createElement(type.startsWith("audio") ? "audio" : "video");
    media.preload = "metadata";
    media.onloadedmetadata = () => {
      resolve(Number.isFinite(media.duration) ? Math.round(media.duration) : 0);
    };
    media.onerror = () => resolve(0);
    media.src = url;
  });
}

function formatDuration(seconds: number) {
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  const remaining = total % 60;
  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}

function formatFileSize(bytes: number | null) {
  if (!bytes) {
    return "Size unknown";
  }

  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function extractUploadUrl(data: UploadResponse): string {
  const payload = data.data ?? data;
  return payload.audio_url ?? payload.url ?? payload.file_url ?? payload.public_url ?? "";
}

function unwrapJob(data: ApiJob): ApiJob {
  return data.data ?? data;
}

function getJobId(data: ApiJob) {
  const job = unwrapJob(data);
  return job.job_id ?? job.id ?? "";
}

function getJobSrt(data: ApiJob) {
  const job = unwrapJob(data);
  return (
    job.srt ??
    job.srt_content ??
    job.subtitles ??
    job.vtt ??
    job.text ??
    job.transcript ??
    job.output ??
    job.content ??
    job.result?.srt ??
    job.result?.srt_content ??
    job.result?.subtitles ??
    job.result?.vtt ??
    job.result?.text ??
    job.result?.transcript ??
    job.result?.output ??
    job.result?.content ??
    ""
  );
}

function getProviderErrorMessage(value: string) {
  const text = value.trim();
  if (!text) {
    return "";
  }

  if (/^(Groq|OpenAI|Whisper)\b.*request failed:/i.test(text)) {
    const jsonStart = text.indexOf("{");
    if (jsonStart >= 0) {
      try {
        const parsed = JSON.parse(text.slice(jsonStart)) as { error?: { message?: string } };
        return parsed.error?.message ? `Transcription provider error: ${parsed.error.message}` : text;
      } catch {
        return text;
      }
    }
    return text;
  }

  try {
    const parsed = JSON.parse(text) as { error?: { message?: string } | string; message?: string };
    if (typeof parsed.error === "string") {
      return parsed.error;
    }
    if (parsed.error?.message) {
      return `Transcription provider error: ${parsed.error.message}`;
    }
    if (parsed.message && /error|failed|invalid/i.test(parsed.message)) {
      return parsed.message;
    }
  } catch {
    // Plain transcript text is expected here.
  }

  return "";
}

function formatSrtTimestamp(timestamp: string) {
  const [time = "00:00:00", milliseconds = "000"] = timestamp.trim().replace(".", ",").split(",");
  const parts = time.split(":");
  const [hours, minutes, seconds] = parts.length === 3 ? parts : ["00", parts[0] ?? "00", parts[1] ?? "00"];

  return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}:${seconds.padStart(2, "0")}.${milliseconds.padEnd(3, "0").slice(0, 3)}`;
}

function parseSubtitleText(value: string): SubtitleRow[] {
  const blocks = value
    .replace(/\r/g, "")
    .replace(/^WEBVTT[^\n]*\n+/i, "")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return blocks.flatMap((block) => {
    const lines = block.split("\n").filter(Boolean);
    const timingIndex = lines.findIndex((line) => line.includes("-->"));

    if (timingIndex === -1) {
      return [];
    }

    const [start = "", endWithSettings = ""] = lines[timingIndex].split("-->").map((part) => part.trim());
    const end = endWithSettings.split(/\s+/)[0] ?? "";
    const text = lines.slice(timingIndex + 1).join("\n").trim();

    if (!start || !end || !text) {
      return [];
    }

    return [[formatSrtTimestamp(start), formatSrtTimestamp(end), text] as SubtitleRow];
  });
}

function buildFallbackSubtitleRows(value: string, mediaDuration: number): SubtitleRow[] {
  const text = value
    .replace(/\r/g, "")
    .replace(/^WEBVTT[^\n]*\n*/i, "")
    .replace(/^\s*\d+\s*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!text) {
    return [];
  }

  const end = mediaDuration > 0 ? formatSrtTimestamp(`00:${formatDuration(mediaDuration)},000`) : "00:00:02.000";
  return [["00:00:00.000", end, text]];
}

function rowsFromTranscription(value: string, mediaDuration: number) {
  const parsedRows = parseSubtitleText(value);
  return parsedRows.length ? parsedRows : buildFallbackSubtitleRows(value, mediaDuration);
}

function parseTimestampToSeconds(value: string) {
  const [time = "0", milliseconds = "0"] = value.trim().replace(",", ".").split(".");
  const parts = time.split(":").map((part) => Number(part));
  const [hours, minutes, seconds] =
    parts.length === 3 ? parts : parts.length === 2 ? [0, parts[0], parts[1]] : [0, 0, parts[0]];

  if (![hours, minutes, seconds].every(Number.isFinite)) {
    return 0;
  }

  return hours * 3600 + minutes * 60 + seconds + Number(`0.${milliseconds || "0"}`);
}

function getJobMessage(job: ApiJob) {
  return job.error ?? job.message ?? "";
}

function jobIsFinishedWithoutText(job: ApiJob) {
  return ["completed", "complete", "succeeded", "success", "done"].includes((job.status ?? "").toLowerCase());
}

function jobHasFailed(job: ApiJob) {
  return ["failed", "error", "cancelled", "canceled"].includes((job.status ?? "").toLowerCase());
}

export function EditorClient() {
  const [playing, setPlaying] = useState(false);
  const [active, setActive] = useState(0);
  const [rows, setRows] = useState<SubtitleRow[]>([]);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState("No file selected");
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [duration, setDuration] = useState(0);
  const [status, setStatus] = useState("No active project");
  const [readError, setReadError] = useState("");
  const [needsLoginForTranscription, setNeedsLoginForTranscription] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [subtitlePage, setSubtitlePage] = useState(0);
  const [captionPosition, setCaptionPosition] = useState({ x: 50, y: 72 });
  const [savedAtLabel, setSavedAtLabel] = useState("");
  const [user, setUser] = useState<ApiUser | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const currentFileRef = useRef<File | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const videoFrameRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const vipPlan = getUserVipPlan(user);
  const extraCreditLabel = getExtraCreditLabel(user);

  useEffect(() => {
    let mounted = true;
    const removeAuthListener = onAuthChange((nextUser) => setUser(nextUser));

    api
      .me()
      .then((data) => {
        if (!mounted) {
          return;
        }
        const nextUser = mergeStoredMembership(normalizeUser(data), getLocalUser());
        setLocalUser(nextUser);
        setUser(nextUser);
      })
      .catch(() => {
        if (mounted) {
          setLocalUser(null);
          setUser(null);
        }
      });

    return () => {
      mounted = false;
      removeAuthListener();
    };
  }, []);

  useEffect(() => {
    const storedCaptionPosition = window.localStorage.getItem(CAPTION_POSITION_KEY);
    if (storedCaptionPosition) {
      try {
        const position = JSON.parse(storedCaptionPosition) as { x?: number; y?: number };
        if (Number.isFinite(position.x) && Number.isFinite(position.y)) {
          setCaptionPosition({
            x: Math.min(90, Math.max(10, position.x ?? 50)),
            y: Math.min(88, Math.max(12, position.y ?? 72))
          });
        }
      } catch {
        window.localStorage.removeItem(CAPTION_POSITION_KEY);
      }
    }

    const storedDraft = window.localStorage.getItem(EDITOR_DRAFT_KEY);
    if (storedDraft) {
      try {
        const draft = JSON.parse(storedDraft) as EditorDraft;
        if (draft.filename) {
          setFilename(draft.filename);
        }
        if (typeof draft.fileSize === "number" || draft.fileSize === null) {
          setFileSize(draft.fileSize);
        }
        if (typeof draft.duration === "number") {
          setDuration(draft.duration);
        }
        if (Array.isArray(draft.rows)) {
          setRows(draft.rows);
          setActive(0);
          setSubtitlePage(0);
        }
        if (draft.savedAt) {
          setSavedAtLabel(new Date(draft.savedAt).toLocaleTimeString());
        }
        setStatus(draft.savedAt ? `Draft restored from ${new Date(draft.savedAt).toLocaleString()}` : "Draft restored");
      } catch {
        window.localStorage.removeItem(EDITOR_DRAFT_KEY);
      }
    }

    const storedUpload = window.sessionStorage.getItem(UPLOAD_META_KEY);
    if (storedUpload) {
      try {
        const upload = JSON.parse(storedUpload) as { id?: string; name?: string; size?: number; type?: string };
        if (upload.name) {
          setFilename(upload.name);
          setStatus(upload.id ? "Loading uploaded file..." : "Select the file again to preview it here");
        }
        if (typeof upload.size === "number") {
          setFileSize(upload.size);
        }
        if (upload.id) {
          getPendingUpload(upload.id)
            .then((pendingUpload) => {
              if (pendingUpload?.file) {
                void handleFile(pendingUpload.file, { autoTranscribe: true });
                void deletePendingUpload(upload.id!);
              } else {
                setStatus("Could not restore the uploaded file. Please upload it again.");
              }
            })
            .catch(() => setStatus("Could not restore the uploaded file. Please upload it again."))
            .finally(() => window.sessionStorage.removeItem(UPLOAD_META_KEY));
        }
      } catch {
        window.sessionStorage.removeItem(UPLOAD_META_KEY);
      }
    }

    const storedJob = window.localStorage.getItem(EDITOR_JOB_KEY);
    if (storedJob) {
      try {
        const job = JSON.parse(storedJob) as { id?: string; filename?: string };
        if (job.id) {
          setStatus(`Resuming transcription for ${job.filename || "last upload"}...`);
          setIsTranscribing(true);
          void pollTranscriptionJob(job.id);
        }
      } catch {
        window.localStorage.removeItem(EDITOR_JOB_KEY);
      }
    }

    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const pageCount = Math.max(1, Math.ceil(rows.length / SUBTITLES_PER_PAGE));
    setSubtitlePage((currentPage) => Math.min(currentPage, pageCount - 1));
  }, [rows.length]);

  async function transcribeFile(file: File, mediaDuration: number) {
    setNeedsLoginForTranscription(false);

    if (file.size > MAX_TRANSCRIPTION_UPLOAD_BYTES) {
      setStatus(
        `Automatic transcription currently supports files up to 25 MB. This file is ${formatFileSize(file.size)}. Please upload a shorter or compressed audio/video file.`
      );
      return;
    }

    setIsTranscribing(true);
    setStatus("Uploading media for transcription...");

    try {
      const upload = await api.upload(file);
      const audioUrl = extractUploadUrl(upload);

      if (!audioUrl) {
        setStatus("Upload completed, but no media URL was returned.");
        setIsTranscribing(false);
        return;
      }

      setStatus("Starting transcription...");
      const initialJob = await api.transcribe({
        audio_url: audioUrl,
        duration_seconds: mediaDuration,
        filename: file.name
      });
      const immediateSrt = getJobSrt(initialJob);

      if (immediateSrt) {
        const providerError = getProviderErrorMessage(immediateSrt);
        if (providerError) {
          setStatus(providerError);
          setIsTranscribing(false);
          return;
        }

        const parsedRows = rowsFromTranscription(immediateSrt, mediaDuration);
        setRows(parsedRows);
        setActive(0);
        setSubtitlePage(0);
        setStatus(parsedRows.length ? "Transcription complete" : "Transcription returned no usable text");
        setIsTranscribing(false);
        return;
      }

      const jobId = getJobId(initialJob);
      if (!jobId) {
        setStatus("Transcription started, but no job id was returned.");
        setIsTranscribing(false);
        return;
      }

      window.localStorage.setItem(EDITOR_JOB_KEY, JSON.stringify({ id: jobId, filename: file.name }));
      await pollTranscriptionJob(jobId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not transcribe this file.";
      const needsAuth = message.toLowerCase().includes("authentication") || message.toLowerCase().includes("unauthorized");
      const quotaExceeded = /usage limit|insufficient credits|quota|free minutes/i.test(message);
      setNeedsLoginForTranscription(needsAuth);
      if (quotaExceeded) {
        setStatus("Free usage limit exceeded. Redirecting to pricing...");
        window.setTimeout(() => {
          window.location.href = "/pricing?reason=usage-limit";
        }, 700);
      } else {
        setStatus(needsAuth ? "Sign in to generate subtitles for this upload." : message);
      }
      setIsTranscribing(false);
    }
  }

  async function pollTranscriptionJob(jobId: string) {
    let failedPolls = 0;

    for (let attempt = 0; attempt < MAX_JOB_POLL_ATTEMPTS; attempt += 1) {
      const pollDelay = attempt === 0 ? 800 : attempt < 30 ? JOB_FAST_POLL_INTERVAL_MS : JOB_SLOW_POLL_INTERVAL_MS;
      await new Promise((resolve) => window.setTimeout(resolve, pollDelay));
      const job = await api.job(jobId);
      const payload = unwrapJob(job);
      const srt = getJobSrt(payload);
      const jobStatus = payload.status ?? "processing";

      if (srt) {
        const providerError = getProviderErrorMessage(srt);
        if (providerError) {
          window.localStorage.removeItem(EDITOR_JOB_KEY);
          setStatus(providerError);
          setIsTranscribing(false);
          return;
        }

        const parsedRows = rowsFromTranscription(srt, duration);
        setRows(parsedRows);
        setActive(0);
        setSubtitlePage(0);
        window.localStorage.removeItem(EDITOR_JOB_KEY);
        setStatus(parsedRows.length ? "Transcription complete" : "Transcription completed, but no usable text was returned.");
        setIsTranscribing(false);
        return;
      }

      if (jobHasFailed(payload)) {
        failedPolls += 1;
        if (failedPolls < 4) {
          setStatus(`Transcription retrying after server error... attempt ${failedPolls}`);
          continue;
        }

        const message = getJobMessage(payload);
        window.localStorage.removeItem(EDITOR_JOB_KEY);
        setStatus(message ? `Transcription failed: ${message}` : "Transcription failed on the server. Please try a shorter audio/video file.");
        setIsTranscribing(false);
        return;
      }

      failedPolls = 0;

      if (jobIsFinishedWithoutText(payload)) {
        window.localStorage.removeItem(EDITOR_JOB_KEY);
        setStatus("Transcription completed, but the server returned an empty subtitle file.");
        setIsTranscribing(false);
        return;
      }

      const elapsedSeconds = attempt < 30
        ? Math.round(((attempt + 1) * JOB_FAST_POLL_INTERVAL_MS) / 1000)
        : Math.round((30 * JOB_FAST_POLL_INTERVAL_MS + (attempt - 29) * JOB_SLOW_POLL_INTERVAL_MS) / 1000);
      setStatus(`Transcribing (${jobStatus})... ${elapsedSeconds}s elapsed`);
    }

    setStatus("Transcription is still processing. Keep this page open or refresh later; the editor will keep checking this job.");
    setIsTranscribing(false);
  }

  async function handleFile(file: File, options: { autoTranscribe?: boolean } = {}) {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }

    const objectUrl = URL.createObjectURL(file);
    objectUrlRef.current = objectUrl;
    currentFileRef.current = file;
    setMediaUrl(objectUrl);
    setFilename(file.name);
    setFileSize(file.size);
    setRows([]);
    setActive(0);
    setSubtitlePage(0);
    setStatus("Reading media...");
    setReadError("");
    window.sessionStorage.setItem(UPLOAD_META_KEY, JSON.stringify({ name: file.name, size: file.size, type: file.type }));

    try {
      const mediaDuration = await readMediaDuration(objectUrl, file.type);
      setDuration(mediaDuration);
      if (options.autoTranscribe ?? true) {
        void transcribeFile(file, mediaDuration);
      } else {
        setStatus("Local file ready, add subtitles to begin");
      }
    } catch (error) {
      setStatus("Ready");
      setReadError(error instanceof Error ? error.message : "Could not read this file.");
    }
  }

  function openFilePicker() {
    uploadInputRef.current?.click();
  }

  function retryTranscriptionAfterLogin() {
    const file = currentFileRef.current;

    if (file) {
      void transcribeFile(file, duration);
    }
  }

  function retryTranscription() {
    const file = currentFileRef.current;

    if (!file) {
      setStatus("Upload the media file again before generating subtitles.");
      return;
    }

    void transcribeFile(file, duration);
  }

  async function togglePlayback() {
    const video = videoRef.current;

    if (!video) {
      openFilePicker();
      return;
    }

    if (video.paused) {
      await video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  }

  function syncActiveRow(currentTime: number) {
    const nextIndex = rows.findIndex(([start, end]) => {
      const startSeconds = parseTimestampToSeconds(start);
      const endSeconds = parseTimestampToSeconds(end);
      return currentTime >= startSeconds && currentTime <= endSeconds;
    });

    if (nextIndex !== -1 && nextIndex !== active) {
      setActive(nextIndex);
      setSubtitlePage(Math.floor(nextIndex / SUBTITLES_PER_PAGE));
    }
  }

  function seekToRow(index: number) {
    const row = rows[index];
    const video = videoRef.current;

    setActive(index);
    setSubtitlePage(Math.floor(index / SUBTITLES_PER_PAGE));

    if (row && video) {
      video.currentTime = parseTimestampToSeconds(row[0]);
    }
  }

  function moveCaptionToPointer(clientX: number, clientY: number) {
    const frame = videoFrameRef.current;

    if (!frame) {
      return;
    }

    const rect = frame.getBoundingClientRect();
    const nextPosition = {
      x: Math.min(90, Math.max(10, ((clientX - rect.left) / rect.width) * 100)),
      y: Math.min(88, Math.max(12, ((clientY - rect.top) / rect.height) * 100))
    };

    setCaptionPosition(nextPosition);
    window.localStorage.setItem(CAPTION_POSITION_KEY, JSON.stringify(nextPosition));
  }

  function startCaptionDrag(event: React.PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    moveCaptionToPointer(event.clientX, event.clientY);
  }

  function dragCaption(event: React.PointerEvent<HTMLDivElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
      return;
    }

    moveCaptionToPointer(event.clientX, event.clientY);
  }

  function stopCaptionDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function saveDraft() {
    const savedAt = new Date().toISOString();
    const draft: EditorDraft = {
      duration,
      fileSize,
      filename,
      rows,
      savedAt
    };

    window.localStorage.setItem(EDITOR_DRAFT_KEY, JSON.stringify(draft));
    const nextSavedAtLabel = new Date(savedAt).toLocaleTimeString();
    setSavedAtLabel(nextSavedAtLabel);
    setStatus(`Draft saved at ${nextSavedAtLabel}`);
  }

  function updateRow(index: number, field: 0 | 1 | 2, value: string) {
    setRows((currentRows) => currentRows.map((row, rowIndex) => {
      if (rowIndex !== index) {
        return row;
      }

      const nextRow: SubtitleRow = [...row];
      nextRow[field] = value;
      return nextRow;
    }));
  }

  function addRow() {
    const nextActive = rows.length;

    setRows((currentRows) => {
      const lastRow = currentRows[currentRows.length - 1];
      const nextRow: SubtitleRow = lastRow
        ? [lastRow[1], lastRow[1], ""]
        : ["00:00:00.000", "00:00:02.000", ""];

      return [...currentRows, nextRow];
    });
    setActive(nextActive);
    setSubtitlePage(Math.floor(nextActive / SUBTITLES_PER_PAGE));
  }

  function deleteRow(index: number) {
    setRows((currentRows) => {
      const nextRows = currentRows.filter((_, rowIndex) => rowIndex !== index);
      setActive((currentActive) => {
        const nextActive = Math.max(0, Math.min(currentActive, nextRows.length - 1));
        setSubtitlePage(Math.floor(nextActive / SUBTITLES_PER_PAGE));
        return nextActive;
      });
      return nextRows;
    });
  }

  const activeRow = rows[active] ?? rows[0];
  const hasProject = filename !== "No file selected" || Boolean(mediaUrl);
  const pageCount = Math.max(1, Math.ceil(rows.length / SUBTITLES_PER_PAGE));
  const firstVisibleSubtitle = subtitlePage * SUBTITLES_PER_PAGE;
  const visibleRows = rows.slice(firstVisibleSubtitle, firstVisibleSubtitle + SUBTITLES_PER_PAGE);
  const canRetryTranscription =
    hasProject &&
    rows.length === 0 &&
    !isTranscribing &&
    !needsLoginForTranscription &&
    /(failed|error|empty|no usable|timed out|usage limit|provider|upload completed|no job id)/i.test(status);

  return (
    <>
      <div className="hidden min-h-screen min-w-[760px] grid-rows-[64px_1fr_36px] bg-bg text-text min-[760px]:grid">
        <header className="flex items-center justify-between border-b border-line bg-panel px-4">
          <Brand />
          <div className="min-w-0 max-w-[42vw] truncate text-center text-sm font-bold text-cyan" aria-label="Current file">
            {filename}
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded border px-2 py-1 text-[11px] font-extrabold uppercase tracking-normal ${getVipBadgeClass(vipPlan)}`}>
              {getVipLabel(vipPlan)}
            </span>
            {extraCreditLabel ? (
              <span className="rounded border border-cyan/40 bg-cyan/10 px-2 py-1 text-[11px] font-extrabold uppercase tracking-normal text-cyan">
                {extraCreditLabel}
              </span>
            ) : null}
            <Button
              variant="secondary"
              className="gap-2"
              type="button"
              onClick={openFilePicker}
            >
              <FileVideo className="h-4 w-4" />
              Upload
            </Button>
            <input
              ref={uploadInputRef}
              className="sr-only"
              type="file"
              accept="video/*,audio/*,.mp4,.mov,.m4a,.mp3"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  handleFile(file);
                }
                event.target.value = "";
              }}
            />
            <Button variant="secondary" size="icon" type="button" aria-label="Play or pause" onClick={togglePlayback}>
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <ExportModal trigger={<Button variant="secondary">Export</Button>} subtitles={rows} filename={filename} user={user} />
            <Button variant="primary" className="gap-2" type="button" onClick={saveDraft}>
              <Save className="h-4 w-4" />
              {savedAtLabel ? "Saved" : "Save"}
            </Button>
          </div>
        </header>
        <main className="grid min-h-0 grid-cols-[60%_40%] overflow-hidden">
          <section className="grid min-h-0 min-w-0 grid-rows-[1fr_auto] border-r border-line bg-[#101A2E] p-5" aria-label="Video editor">
            <div ref={videoFrameRef} className="relative grid min-h-[320px] place-items-center overflow-hidden rounded border border-line bg-bg">
              {mediaUrl ? (
                <video
                  ref={videoRef}
                  className="h-full max-h-[calc(100vh-210px)] w-full object-contain"
                  src={mediaUrl}
                  controls
                  onPause={() => setPlaying(false)}
                  onPlay={() => setPlaying(true)}
                  onTimeUpdate={(event) => syncActiveRow(event.currentTarget.currentTime)}
                />
              ) : (
                <div className="absolute inset-0 bg-panel-2" />
              )}
              {!mediaUrl ? (
                <button className="relative z-[1] max-w-[420px] rounded border border-line bg-panel/90 p-5 text-center shadow-panel transition hover:-translate-y-px hover:border-cyan/60" type="button" onClick={openFilePicker}>
                  <FileVideo className="mx-auto mb-3 h-8 w-8 text-cyan" />
                  <h2 className="mb-2 text-lg font-extrabold">{hasProject ? filename : "Upload a video or audio file"}</h2>
                  <p className="text-sm font-semibold text-soft">
                    {hasProject
                      ? `${formatFileSize(fileSize)} · Select the file again here to preview it in the browser.`
                      : "Start with your own file. The editor will stay empty until subtitles are added or generated."}
                  </p>
                </button>
              ) : null}
              {readError ? (
                <div className="absolute left-4 right-4 top-4 flex items-center justify-between gap-3 rounded border border-red-400/30 bg-panel/95 px-3 py-2 text-sm font-semibold text-red-300">
                  <span>{readError}</span>
                  <button className="shrink-0 text-xs font-extrabold text-red-200 underline underline-offset-2" type="button" onClick={() => {
                    setReadError("");
                  }}>
                    Close
                  </button>
                </div>
              ) : null}
              {needsLoginForTranscription ? (
                <div className="absolute left-4 right-4 top-4 z-10 flex items-center justify-between gap-3 rounded border border-cyan/40 bg-panel/95 px-3 py-2 text-sm font-semibold text-cyan">
                  <span>Sign in to generate subtitles from this video.</span>
                  <LoginModal
                    trigger={<Button variant="secondary" size="sm" type="button">Sign in</Button>}
                    onLoginSuccess={retryTranscriptionAfterLogin}
                  />
                </div>
              ) : null}
              {activeRow ? (
                <div
                  className="absolute z-10 max-w-[70%] cursor-move touch-none select-none rounded bg-black/60 px-4 py-2 text-center text-lg font-extrabold shadow-panel"
                  role="button"
                  tabIndex={0}
                  aria-label="Drag subtitle position"
                  style={{
                    left: `${captionPosition.x}%`,
                    top: `${captionPosition.y}%`,
                    transform: "translate(-50%, -50%)"
                  }}
                  onPointerDown={startCaptionDrag}
                  onPointerMove={dragCaption}
                  onPointerUp={stopCaptionDrag}
                  onPointerCancel={stopCaptionDrag}
                >
                  {activeRow[2]}
                </div>
              ) : null}
            </div>
            <div className="mt-4 flex items-center justify-end">
              <span className="text-sm font-semibold text-soft">{rows.length} subtitles · {filename} · {formatFileSize(fileSize)}</span>
            </div>
          </section>
          <aside className="mb-5 ml-0 mr-5 mt-5 grid min-h-0 min-w-0 grid-rows-[56px_1fr_52px] self-stretch overflow-hidden rounded border border-line bg-panel" aria-label="Subtitle table">
            <div className="flex items-center justify-between border-b border-line px-5">
              <h1 className="mb-0 text-xl font-extrabold">Subtitles</h1>
              <Button variant="secondary" size="sm" className="gap-2" type="button" onClick={addRow}>
                <Plus className="h-4 w-4" />
                Row
              </Button>
            </div>
            <div className="min-h-0 overflow-hidden">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-panel-2 text-xs uppercase tracking-normal text-soft">
                  <tr>
                    <th className="w-12 border-b border-line px-3 py-2">#</th>
                    <th className="w-[168px] border-b border-line px-3 py-2">Start-End</th>
                    <th className="border-b border-line px-3 py-2">Text</th>
                    <th className="w-12 border-b border-line px-3 py-2" aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {rows.length ? (
                    visibleRows.map(([start, end, text], pageIndex) => {
                      const index = firstVisibleSubtitle + pageIndex;

                      return (
                      <tr
                        key={index}
                        className={`cursor-pointer border-b border-line/70 ${active === index ? "bg-cyan/10" : "hover:bg-panel-2"}`}
                        onClick={() => seekToRow(index)}
                      >
                        <td className="px-3 py-1.5 text-soft">{index + 1}</td>
                        <td className="px-3 py-1.5 font-mono text-xs text-cyan">
                          <div className="grid gap-1">
                            <input
                              className="h-6 rounded border border-line bg-bg px-2 text-cyan outline-none focus:border-cyan"
                              value={start}
                              aria-label={`Start time row ${index + 1}`}
                              onChange={(event) => updateRow(index, 0, event.target.value)}
                            />
                            <input
                              className="h-6 rounded border border-line bg-bg px-2 text-cyan outline-none focus:border-cyan"
                              value={end}
                              aria-label={`End time row ${index + 1}`}
                              onChange={(event) => updateRow(index, 1, event.target.value)}
                            />
                          </div>
                        </td>
                        <td className="px-3 py-1.5 text-muted">
                          <textarea
                            className="h-12 w-full resize-none rounded border border-line bg-bg px-3 py-1.5 text-text outline-none focus:border-cyan"
                            value={text}
                            aria-label={`Subtitle text row ${index + 1}`}
                            placeholder="Subtitle text"
                            onChange={(event) => updateRow(index, 2, event.target.value)}
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            type="button"
                            aria-label={`Delete subtitle row ${index + 1}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              deleteRow(index);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-soft" />
                          </Button>
                        </td>
                      </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td className="px-5 py-10 text-center text-sm font-semibold text-soft" colSpan={4}>
                        <div className="mx-auto grid max-w-[460px] justify-items-center gap-3">
                          <span>
                            {hasProject || status !== "No active project"
                              ? status
                              : "No subtitles yet. Upload media, then add a row or generate subtitles from your backend workflow."}
                          </span>
                          {canRetryTranscription ? (
                            <Button variant="secondary" size="sm" type="button" onClick={retryTranscription}>
                              Generate subtitles
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-line px-5 text-xs font-semibold text-soft">
              <span>
                {rows.length
                  ? `${firstVisibleSubtitle + 1}-${Math.min(rows.length, firstVisibleSubtitle + SUBTITLES_PER_PAGE)} of ${rows.length}`
                  : "0 subtitles"}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="icon"
                  type="button"
                  aria-label="Previous subtitle page"
                  disabled={subtitlePage === 0}
                  onClick={() => setSubtitlePage((currentPage) => Math.max(0, currentPage - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="min-w-16 text-center text-cyan">
                  {subtitlePage + 1} / {pageCount}
                </span>
                <Button
                  variant="secondary"
                  size="icon"
                  type="button"
                  aria-label="Next subtitle page"
                  disabled={subtitlePage >= pageCount - 1}
                  onClick={() => setSubtitlePage((currentPage) => Math.min(pageCount - 1, currentPage + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </aside>
        </main>
        <footer className="flex items-center gap-5 border-t border-line bg-panel px-4 text-xs font-semibold text-soft">
          <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-success" />{status}</span>
          <span>{rows.length} subtitles</span>
          <span><span className="font-mono text-cyan">{formatDuration(duration)}</span> duration</span>
          {savedAtLabel ? <span>Saved {savedAtLabel}</span> : null}
          <span>{filename}</span>
        </footer>
      </div>
      <div className="grid min-h-screen place-items-center bg-bg p-6 min-[760px]:hidden">
        <div className="max-w-md rounded border border-line bg-panel p-6 text-center shadow-panel">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded bg-indigo font-extrabold">VS</div>
          <h1 className="mb-3 text-2xl font-extrabold">VideoToSRT Subtitle Editor</h1>
          <p className="mb-5 leading-6 text-muted">The MVP subtitle editor is built for desktop workflows with a minimum width of 760px.</p>
          <Button variant="primary" onClick={() => history.back()}>Go back</Button>
        </div>
      </div>
    </>
  );
}
