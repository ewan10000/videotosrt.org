"use client";

import Link from "next/link";

interface UploadStatusProps {
  filename?: string;
  progress?: number;
  status?: "idle" | "uploading" | "processing" | "complete" | "error";
}

interface UploadStep {
  name: string;
  state: string;
  progress: number;
}

const statusLabels: Record<NonNullable<UploadStatusProps["status"]>, string> = {
  idle: "Idle",
  uploading: "Uploading",
  processing: "Processing",
  complete: "Complete",
  error: "Error"
};

function clampProgress(progress: number) {
  return Math.min(100, Math.max(0, Math.round(progress)));
}

function getSteps(status: NonNullable<UploadStatusProps["status"]>, progress: number): UploadStep[] {
  if (status === "idle") {
    return [];
  }

  if (status === "uploading") {
    return [{ name: "Upload", state: "Uploading", progress }];
  }

  if (status === "processing") {
    return [
      { name: "Upload", state: "Complete", progress: 100 },
      { name: "Processing", state: "Processing", progress }
    ];
  }

  if (status === "complete") {
    return [
      { name: "Upload", state: "Complete", progress: 100 },
      { name: "Processing", state: "Complete", progress: 100 },
      { name: "Ready to export", state: "Complete", progress: 100 }
    ];
  }

  return [
    { name: "Upload", state: progress > 0 ? "Complete" : "Error", progress: progress > 0 ? 100 : 0 },
    { name: "Processing", state: "Error", progress }
  ];
}

export function UploadStatus({ filename, progress = 0, status = "idle" }: UploadStatusProps) {
  if (!filename) {
    return (
      <div className="rounded border border-line bg-panel p-5 shadow-panel">
        <div>
          <h3 className="mb-1 text-lg font-extrabold">No Active Upload</h3>
          <p className="mb-5 text-sm text-muted">Drop a video to get started.</p>
        </div>
        <Link
          href="/editor"
          className="inline-flex min-h-11 items-center justify-center rounded bg-cyan px-4 text-sm font-extrabold text-[#07111F] transition hover:bg-[#7FE8FF]"
        >
          Go to editor
        </Link>
      </div>
    );
  }

  const normalizedProgress = status === "complete" ? 100 : clampProgress(progress);
  const steps = getSteps(status, normalizedProgress);

  return (
    <div className="rounded border border-line bg-panel p-5 shadow-panel">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="mb-1 text-lg font-extrabold">Processing upload</h3>
          <p className="mb-0 text-sm text-muted">{filename}</p>
        </div>
        <span className="rounded bg-cyan/10 px-3 py-1 text-sm font-extrabold text-cyan">{statusLabels[status]}</span>
      </div>
      <div className="mb-5 h-2 overflow-hidden rounded-full bg-[#24324B]">
        <div className="h-full bg-cyan transition-all" style={{ width: `${normalizedProgress}%` }} />
      </div>
      <div className="grid gap-3">
        {steps.map((step) => (
          <div key={step.name} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded border border-line bg-panel-2 p-3">
            <div>
              <strong className="block text-sm">{step.name}</strong>
              <span className="text-xs text-soft">{step.state}</span>
            </div>
            <span className="font-mono text-xs text-muted">{step.progress}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
