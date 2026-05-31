"use client";

const steps = [
  ["Upload", "Complete", "100%"],
  ["Audio extraction", "Complete", "100%"],
  ["Whisper transcription", "Processing", "64%"],
  ["Subtitle cleanup", "Queued", "0%"]
];

export function UploadStatus() {
  return (
    <div className="rounded border border-line bg-panel p-5 shadow-panel">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="mb-1 text-lg font-extrabold">Processing upload</h3>
          <p className="mb-0 text-sm text-muted">interview-cut-final.mp4</p>
        </div>
        <span className="rounded bg-cyan/10 px-3 py-1 text-sm font-extrabold text-cyan">64%</span>
      </div>
      <div className="mb-5 h-2 overflow-hidden rounded-full bg-[#24324B]">
        <div className="h-full w-[64%] bg-cyan transition-all" />
      </div>
      <div className="grid gap-3">
        {steps.map(([name, state, pct]) => (
          <div key={name} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded border border-line bg-panel-2 p-3">
            <div>
              <strong className="block text-sm">{name}</strong>
              <span className="text-xs text-soft">{state}</span>
            </div>
            <span className="font-mono text-xs text-muted">{pct}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
