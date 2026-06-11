"use client";

import { useEffect, useRef, useState } from "react";
import { FileVideo, Pause, Play, Plus, Save, SkipBack, SkipForward, Trash2 } from "lucide-react";
import { Brand } from "@/components/brand";
import { ExportModal } from "@/components/modals/export-modal";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/lib/api";
import { refreshAuthUser, useAuthUser } from "@/lib/auth";

type SubtitleRow = [string, string, string];

type StoredUpload = {
  jobId?: string;
  filename?: string;
  mediaUrl?: string;
  name?: string;
  size?: number;
};

type UploadResult = {
  url: string;
  filename: string;
  size: number;
};

type JobResult = {
  id: string;
  status: string;
  srt_content?: string | null;
  error?: string;
  message?: string;
};

function readMediaDuration(url: string, type = "video") {
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

function parseSrtTimestamp(value: string) {
  const match = value.trim().replace(",", ".").match(/^(?:(\d+):)?(\d{1,2}):(\d{1,2})(?:\.(\d{1,3}))?$/);

  if (!match) {
    return 0;
  }

  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  const milliseconds = Number((match[4] ?? "0").padEnd(3, "0"));

  return (((hours * 60 + minutes) * 60) + seconds) * 1000 + milliseconds;
}

function formatSrtTimestamp(milliseconds: number) {
  const total = Math.max(0, Math.round(milliseconds));
  const hours = Math.floor(total / 3600000);
  const minutes = Math.floor((total % 3600000) / 60000);
  const seconds = Math.floor((total % 60000) / 1000);
  const ms = total % 1000;

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${ms.toString().padStart(3, "0")}`;
}

function parseSrt(srt: string): Array<{ start: number; end: number; text: string }> {
  return srt
    .replace(/\r/g, "")
    .trim()
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block.split("\n").filter(Boolean);
      const timingIndex = lines.findIndex((line) => line.includes("-->"));

      if (timingIndex === -1) {
        return null;
      }

      const [start = "", end = ""] = lines[timingIndex].split("-->").map((part) => part.trim().split(/\s+/)[0]);
      const text = lines.slice(timingIndex + 1).join("\n").trim();

      if (!text) {
        return null;
      }

      return {
        start: parseSrtTimestamp(start),
        end: parseSrtTimestamp(end),
        text
      };
    })
    .filter((row): row is { start: number; end: number; text: string } => Boolean(row));
}

function getApiErrorMessage(status: number, fallback: string) {
  if (status === 401 || status === 403) {
    return "Please sign in before uploading or checking this transcription.";
  }

  if (status === 413) {
    return "This file is too large to upload.";
  }

  return fallback || "Request failed. Please try again.";
}

async function uploadFile(file: File, onProgress?: (pct: number) => void): Promise<UploadResult> {
  const contentType = file.type || "application/octet-stream";
  const params = new URLSearchParams({
    filename: file.name,
    contentType
  });
  const presignRes = await fetch(`${API_BASE_URL}/upload/presign?${params}`, {
    method: "GET",
    headers: (() => {
      const h: Record<string, string> = {};
      const token = typeof window !== "undefined" ? window.localStorage.getItem("videotosrt.auth.session_token") : null;
      if (token) h["Authorization"] = `Bearer ${token}`;
      return h;
    })()
  });
  const presign = await presignRes.json().catch(() => null) as {
    url?: string;
    key?: string;
    filename?: string;
    error?: string;
  } | null;

  if (!presignRes.ok || !presign?.url || !presign.key) {
    throw new Error(getApiErrorMessage(presignRes.status, presign?.error || "Failed to get upload URL"));
  }

  const uploadUrl = presign.url;
  const uploadKey = presign.key;

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl, true);
    xhr.setRequestHeader("Content-Type", contentType);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed: ${xhr.statusText || xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error("Network error while uploading. Please try again."));
    xhr.onabort = () => reject(new Error("Upload cancelled."));

    xhr.send(file);
  });

  const urlRes = await fetch(
    `${API_BASE_URL}/upload/url?key=${encodeURIComponent(uploadKey)}`,
    {
      method: "GET",
      headers: (() => {
        const h: Record<string, string> = {};
        const token = typeof window !== "undefined" ? window.localStorage.getItem("videotosrt.auth.session_token") : null;
        if (token) h["Authorization"] = `Bearer ${token}`;
        return h;
      })()
    }
  );
  const urlPayload = await urlRes.json().catch(() => null) as { url?: string; error?: string } | null;

  if (!urlRes.ok || !urlPayload?.url) {
    throw new Error(getApiErrorMessage(urlRes.status, urlPayload?.error || "Failed to get media URL"));
  }

  return { url: urlPayload.url, filename: presign.filename || file.name, size: file.size };
}

async function createTranscriptionJob(upload: UploadResult, durationSeconds: number) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };
  const token = typeof window !== "undefined" ? window.localStorage.getItem("videotosrt.auth.session_token") : null;
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/transcribe`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      filename: upload.filename,
      audio_url: upload.url,
      duration_seconds: durationSeconds
    })
  });
  const payload = await response.json().catch(() => null) as { job_id?: string; error?: string } | null;

  if (!response.ok || !payload?.job_id) {
    throw new Error(getApiErrorMessage(response.status, payload?.error || response.statusText));
  }

  return payload.job_id;
}

export function EditorClient() {
  const { user, loading: authLoading } = useAuthUser();
  const [playing, setPlaying] = useState(false);
  const [active, setActive] = useState(2);
  const [rows, setRows] = useState<SubtitleRow[]>([]);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState("");
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [duration, setDuration] = useState(0);
  const [status, setStatus] = useState("Ready");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);
  const [readError, setReadError] = useState("");
  const uploadInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const storedUpload = window.sessionStorage.getItem("videotosrt.upload");
    if (storedUpload) {
      try {
        const upload = JSON.parse(storedUpload) as StoredUpload;
        const storedFilename = upload.filename || upload.name;

        if (storedFilename) {
          setFilename(storedFilename);
        }
        if (upload.mediaUrl) {
          setMediaUrl(upload.mediaUrl);
          setStatus(upload.jobId ? "Transcription queued" : "Media ready");
        }
        if (typeof upload.size === "number") {
          setFileSize(upload.size);
        }
        if (upload.jobId) {
          setJobId(upload.jobId);
        }
      } catch {
        window.sessionStorage.removeItem("videotosrt.upload");
      }
    }
  }, []);

  useEffect(() => {
    if (!mediaUrl) {
      return;
    }

    let cancelled = false;

    readMediaDuration(mediaUrl).then((mediaDuration) => {
      if (!cancelled && mediaDuration > 0) {
        setDuration(mediaDuration);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [mediaUrl]);

  useEffect(() => {
    if (!jobId) {
      return;
    }

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    async function pollJob() {
      try {
        const response = await fetch(`${API_BASE_URL}/jobs/${jobId}`, {
          headers: (() => {
            const h: Record<string, string> = {};
            const token = typeof window !== "undefined" ? window.localStorage.getItem("videotosrt.auth.session_token") : null;
            if (token) h["Authorization"] = `Bearer ${token}`;
            return h;
          })()
        });
        const payload = await response.json().catch(() => null) as JobResult | null;

        if (!response.ok || !payload) {
          throw new Error(getApiErrorMessage(response.status, payload?.error || response.statusText));
        }

        if (cancelled) {
          return;
        }

        if (payload.status === "completed") {
          const parsedRows = parseSrt(payload.srt_content || "").map(({ start, end, text }) => [
            formatSrtTimestamp(start),
            formatSrtTimestamp(end),
            text
          ] as SubtitleRow);

          setRows(parsedRows);
          setActive(0);
          setStatus("Transcription completed");
          setReadError(parsedRows.length ? "" : "Transcription completed, but no subtitles were returned.");
          return;
        }

        if (payload.status === "failed") {
          setStatus("Transcription failed");
          setReadError(payload.error || payload.message || "Transcription failed. Please try another file.");
          return;
        }

        setStatus(`Transcription ${payload.status}`);
        timeoutId = setTimeout(pollJob, 2000);
      } catch (error) {
        if (!cancelled) {
          setStatus("Could not check transcription");
          setReadError(error instanceof Error ? error.message : "Could not check transcription status.");
        }
      }
    }

    pollJob();

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [jobId]);

  async function handleFile(file: File) {
    const authUser = user ?? (authLoading ? await refreshAuthUser() : null);

    if (!authUser) {
      setReadError("Please sign in before uploading or checking this transcription.");
      return;
    }

    setFilename(file.name);
    setFileSize(file.size);
    setUploadProgress(0);
    setStatus("Uploading media...");
    setReadError("");

    try {
      const localUrl = URL.createObjectURL(file);
      const mediaDuration = await readMediaDuration(localUrl, file.type);
      URL.revokeObjectURL(localUrl);
      setDuration(mediaDuration);
      const uploadResult = await uploadFile(file, (pct) => {
        setUploadProgress(pct);
        setStatus(`Uploading media... ${pct}%`);
      });
      setMediaUrl(uploadResult.url);
      setFileSize(uploadResult.size);
      setStatus("Creating transcription job...");
      const nextJobId = await createTranscriptionJob(uploadResult, mediaDuration);
      window.sessionStorage.setItem("videotosrt.upload", JSON.stringify({
        jobId: nextJobId,
        filename: uploadResult.filename,
        mediaUrl: uploadResult.url,
        size: uploadResult.size
      }));
      setJobId(nextJobId);
      setStatus("Transcription queued");
    } catch (error) {
      setStatus("Ready");
      setReadError(error instanceof Error ? error.message : "Could not read this file.");
    }
  }

  function openFilePicker() {
    uploadInputRef.current?.click();
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
        ? [lastRow[1], lastRow[1], "New subtitle text"]
        : ["00:00:00.000", "00:00:02.000", "New subtitle text"];

      return [...currentRows, nextRow];
    });
    setActive(nextActive);
  }

  function deleteRow(index: number) {
    setRows((currentRows) => {
      const nextRows = currentRows.filter((_, rowIndex) => rowIndex !== index);
      setActive((currentActive) => Math.max(0, Math.min(currentActive, nextRows.length - 1)));
      return nextRows;
    });
  }

  const activeRow = rows[active] ?? rows[0];

  return (
    <>
      <div className="hidden min-h-screen min-w-[760px] grid-rows-[64px_1fr_36px] bg-bg text-text min-[760px]:grid">
        <header className="flex items-center justify-between border-b border-line bg-panel px-4">
          <Brand />
          <div className="min-w-0 max-w-[42vw] truncate text-center text-sm font-bold text-cyan" aria-label="Current file">
            {filename}
          </div>
          <div className="flex items-center gap-2">
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
            <Button variant="secondary" size="icon" type="button" aria-label="Play or pause" onClick={() => setPlaying((value) => !value)}>
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <ExportModal trigger={<Button variant="secondary">Export</Button>} subtitles={rows} filename={filename} />
            <Button variant="primary" className="gap-2" type="button"><Save className="h-4 w-4" /> Save</Button>
          </div>
        </header>
        <main className="grid min-h-0 grid-cols-[60%_40%] max-[1100px]:grid-cols-1">
          <section className="grid min-h-0 grid-rows-[1fr_auto] border-r border-line bg-[#101A2E] p-5 max-[1100px]:border-b max-[1100px]:border-r-0" aria-label="Video editor">
            <div className="relative grid min-h-[320px] place-items-center overflow-hidden rounded border border-line bg-bg">
              {mediaUrl ? (
                <video className="h-full max-h-[calc(100vh-260px)] w-full object-contain" src={mediaUrl} controls />
              ) : (
                <>
                  <div className="absolute inset-0 [background:radial-gradient(circle_at_30%_20%,rgba(99,102,241,.25),transparent_30%),linear-gradient(135deg,rgba(34,211,238,.12),transparent_45%)]" />
                  <button className="relative grid h-[68px] w-[68px] place-items-center rounded-full bg-indigo text-xl" type="button" aria-label="Play video" onClick={() => setPlaying((value) => !value)}>
                    {playing ? "Ⅱ" : "▶"}
                  </button>
                </>
              )}
              {!mediaUrl && rows.length === 0 ? (
                <div className="relative z-[1] max-w-[420px] rounded border border-line bg-panel/90 p-5 text-center shadow-panel">
                  <FileVideo className="mx-auto mb-3 h-8 w-8 text-cyan" />
                  <h2 className="mb-2 text-lg font-extrabold">Upload a video to get started</h2>
                  <p className="text-sm font-semibold text-soft">
                    Drag and drop or click Upload to transcribe
                  </p>
                </div>
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
              {activeRow ? (
                <div className="absolute bottom-8 max-w-[70%] rounded bg-black/60 px-4 py-2 text-center text-lg font-extrabold">
                  {activeRow[2]}
                </div>
              ) : null}
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
                <span className="text-sm font-semibold text-soft">{rows.length} subtitles · {filename} · {formatFileSize(fileSize)}</span>
              </div>
            </div>
          </section>
          <aside className="grid min-h-0 grid-rows-[62px_1fr] bg-panel" aria-label="Subtitle table">
            <div className="flex items-center justify-between border-b border-line px-5">
              <h2 className="mb-0 text-xl font-extrabold">Subtitles</h2>
              <Button variant="secondary" size="sm" className="gap-2" type="button" onClick={addRow}>
                <Plus className="h-4 w-4" />
                Row
              </Button>
            </div>
            <div className="min-h-0 overflow-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="sticky top-0 z-10 bg-panel-2 text-xs uppercase tracking-normal text-soft">
                  <tr>
                    <th className="w-12 border-b border-line px-3 py-3">#</th>
                    <th className="w-[190px] border-b border-line px-3 py-3">Start-End</th>
                    <th className="border-b border-line px-3 py-3">Text</th>
                    <th className="w-12 border-b border-line px-3 py-3" aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map(([start, end, text], index) => (
                    <tr
                      key={index}
                      className={`cursor-pointer border-b border-line/70 ${active === index ? "bg-cyan/10" : "hover:bg-panel-2"}`}
                      onClick={() => setActive(index)}
                    >
                      <td className="px-3 py-3 text-soft">{index + 1}</td>
                      <td className="px-3 py-3 font-mono text-xs text-cyan">
                        <div className="grid gap-2">
                          <input
                            className="rounded border border-line bg-bg px-2 py-1 text-cyan outline-none focus:border-cyan"
                            value={start}
                            aria-label={`Start time row ${index + 1}`}
                            onChange={(event) => updateRow(index, 0, event.target.value)}
                          />
                          <input
                            className="rounded border border-line bg-bg px-2 py-1 text-cyan outline-none focus:border-cyan"
                            value={end}
                            aria-label={`End time row ${index + 1}`}
                            onChange={(event) => updateRow(index, 1, event.target.value)}
                          />
                        </div>
                      </td>
                      <td className="px-3 py-3 text-muted">
                        <textarea
                          className="min-h-16 w-full resize-y rounded border border-line bg-bg px-3 py-2 text-text outline-none focus:border-cyan"
                          value={text}
                          aria-label={`Subtitle text row ${index + 1}`}
                          onChange={(event) => updateRow(index, 2, event.target.value)}
                        />
                      </td>
                      <td className="px-3 py-3">
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
                  ))}
                </tbody>
              </table>
            </div>
          </aside>
        </main>
        <footer className="flex items-center gap-5 border-t border-line bg-panel px-4 text-xs font-semibold text-soft">
          <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-success" />{status}</span>
          <span>{rows.length} subtitles</span>
          <span><span className="font-mono text-cyan">{formatDuration(duration)}</span> duration</span>
          <span>{filename}</span>
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
