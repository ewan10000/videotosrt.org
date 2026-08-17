import type { Bindings } from "../types";
import { GROQ_MULTIPART_ATTACHMENT_SIZE_LIMIT_BYTES } from "./transcription-limits";

type GroqVerboseTranscription = {
  segments?: Array<{
    start?: number;
    end?: number;
    text?: string;
  }>;
};

export type TranscriptionSegment = {
  start: number;
  end: number;
  text: string;
};

export class TranscriptionProviderError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly providerFailure = true,
  ) {
    super(message);
    this.name = "TranscriptionProviderError";
  }
}

export async function transcribeWithGroq(env: Bindings, audioUrl: string, filename: string, fileSizeBytes: number) {
  return segmentsToSrt(await transcribeSegmentsWithGroq(env, audioUrl, filename, fileSizeBytes));
}

export async function transcribeSegmentsWithGroq(env: Bindings, audioUrl: string, filename: string, fileSizeBytes: number) {
  const form = new FormData();
  form.set("model", "whisper-large-v3-turbo");
  form.set("response_format", "verbose_json");

  let audioBlob: Blob | null = null;
  if (fileSizeBytes <= GROQ_MULTIPART_ATTACHMENT_SIZE_LIMIT_BYTES) {
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) {
      throw new Error(`Failed to fetch audio URL: ${audioResponse.status}`);
    }

    audioBlob = await audioResponse.blob();
    form.set("file", new File([audioBlob], filename || "audio", { type: audioBlob.type || "application/octet-stream" }));
  } else {
    form.set("url", audioUrl);
  }

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
      provider: "groq",
      status: response.status,
      statusText: response.statusText,
      payloadMode: audioBlob ? "multipart" : "url",
    });
    throw new TranscriptionProviderError(response.status, `Groq Whisper request failed with status ${response.status}`);
  }

  return verboseJsonToSegments(JSON.parse(text) as GroqVerboseTranscription);
}

export function segmentsToSrt(segments: TranscriptionSegment[]) {
  if (segments.length === 0) {
    throw new Error("Groq Whisper response did not include timestamped segments");
  }

  const cues = segments.map((segment, index) => {
    const start = formatSrtTimestamp(segment.start);
    const end = formatSrtTimestamp(Math.max(segment.end, segment.start));
    const text = segment.text.trim().replace(/\r\n?/g, "\n");
    return `${index + 1}\n${start} --> ${end}\n${text}`;
  });

  return `${cues.join("\n\n")}\n`;
}

function verboseJsonToSegments(transcription: GroqVerboseTranscription) {
  const segments = transcription.segments ?? [];
  const parsedSegments: TranscriptionSegment[] = [];

  for (const segment of segments) {
    if (
      typeof segment.start !== "number" ||
      typeof segment.end !== "number" ||
      typeof segment.text !== "string" ||
      segment.text.trim().length === 0
    ) {
      continue;
    }

    const text = segment.text.trim().replace(/\r\n?/g, "\n");
    parsedSegments.push({ start: segment.start, end: Math.max(segment.end, segment.start), text });
  }

  if (parsedSegments.length === 0) {
    throw new Error("Groq Whisper response did not include timestamped segments");
  }

  return parsedSegments;
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
