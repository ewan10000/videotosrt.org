export type SubtitleRow = [string, string, string];

function timestamp(value: string, cue: number): { text: string; milliseconds: number } {
  const match = /^(\d{2,}):(\d{2}):(\d{2})[,.](\d{1,3})$/.exec(value);
  if (!match || Number(match[2]) > 59 || Number(match[3]) > 59) {
    throw new Error(`Cue ${cue}: invalid timestamp "${value}". Use HH:MM:SS,mmm.`);
  }
  const [, hours, minutes, seconds, fraction] = match;
  const ms = fraction.padEnd(3, "0");
  return {
    text: `${hours}:${minutes}:${seconds}.${ms}`,
    milliseconds: ((Number(hours) * 60 + Number(minutes)) * 60 + Number(seconds)) * 1000 + Number(ms)
  };
}

/** Strict local import: never silently drop malformed cues or turn them into prose. */
export function parseSrt(value: string): SubtitleRow[] {
  const text = value.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").trim();
  if (!text) throw new Error("SRT is empty. Add at least one numbered cue with timing and text.");
  return text.split(/\n[ \t]*\n+/).map((block, index) => {
    const cue = index + 1;
    const lines = block.split("\n");
    if (!/^\d+$/.test(lines[0].trim())) throw new Error(`Cue ${cue}: missing numeric cue number.`);
    const timing = /^\s*(\S+)\s*-->\s*(\S+)\s*$/.exec(lines[1] ?? "");
    if (!timing) throw new Error(`Cue ${cue}: expected a start --> end timing line.`);
    const start = timestamp(timing[1], cue);
    const end = timestamp(timing[2], cue);
    if (end.milliseconds <= start.milliseconds) throw new Error(`Cue ${cue}: end time must be after start time.`);
    const content = lines.slice(2).join("\n").trim();
    if (!content) throw new Error(`Cue ${cue}: subtitle text is missing.`);
    return [start.text, end.text, content];
  });
}

export async function readSrtFile(file: Pick<File, "name" | "arrayBuffer">): Promise<SubtitleRow[]> {
  if (!/\.srt$/i.test(file.name)) throw new Error("Choose an .srt file encoded as UTF-8.");
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer());
  } catch {
    throw new Error("Could not read the SRT file. Save it as UTF-8 and try again.");
  }
  return parseSrt(text);
}
