import type { Bindings } from "../types";

type GroqVerboseTranscription = {
  segments?: Array<{
    start?: number;
    end?: number;
    text?: string;
  }>;
};

export async function transcribeWithGroq(env: Bindings, audioUrl: string, filename: string) {
  const audioResponse = await fetch(audioUrl);
  if (!audioResponse.ok) {
    throw new Error(`Failed to fetch audio URL: ${audioResponse.status}`);
  }

  const audioBlob = await audioResponse.blob();
  const form = new FormData();
  form.set("model", "whisper-large-v3-turbo");
  form.set("response_format", "verbose_json");
  form.set("file", new File([audioBlob], filename || "audio", { type: audioBlob.type || "application/octet-stream" }));

  const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.GROQ_API_KEY}`,
    },
    body: form,
  });

  const text = await response.text();
  if (!response.ok) {
    console.error("[Groq API Error]", {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: text,
      filename,
      audioBlobType: audioBlob.type,
      audioBlobSize: audioBlob.size,
    });
    throw new Error(`Groq Whisper request failed: ${response.status} ${text.slice(0, 300)}`);
  }

  return verboseJsonToSrt(JSON.parse(text) as GroqVerboseTranscription);
}

function verboseJsonToSrt(transcription: GroqVerboseTranscription) {
  const segments = transcription.segments ?? [];
  const cues: string[] = [];

  for (const segment of segments) {
    if (
      typeof segment.start !== "number" ||
      typeof segment.end !== "number" ||
      typeof segment.text !== "string" ||
      segment.text.trim().length === 0
    ) {
      continue;
    }

    const start = formatSrtTimestamp(segment.start);
    const end = formatSrtTimestamp(Math.max(segment.end, segment.start));
    const text = segment.text.trim().replace(/\r\n?/g, "\n");

    cues.push(`${cues.length + 1}\n${start} --> ${end}\n${text}`);
  }

  if (cues.length === 0) {
    throw new Error("Groq Whisper response did not include timestamped segments");
  }

  return `${cues.join("\n\n")}\n`;
}

function formatSrtTimestamp(seconds: number) {
  const totalMilliseconds = Math.max(0, Math.round(seconds * 1000));
  const milliseconds = totalMilliseconds % 1000;
  const totalSeconds = Math.floor(totalMilliseconds / 1000);
  const s = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const m = totalMinutes % 60;
  const h = Math.floor(totalMinutes / 60);

  return `${pad(h, 2)}:${pad(m, 2)}:${pad(s, 2)},${pad(milliseconds, 3)}`;
}

function pad(value: number, width: number) {
  return value.toString().padStart(width, "0");
}
