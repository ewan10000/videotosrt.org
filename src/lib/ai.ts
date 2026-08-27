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
    public readonly details: { providerCode?: string; providerMessage?: string } = {},
  ) {
    super(message);
    this.name = "TranscriptionProviderError";
  }
}

export async function transcribeWithGroq(env: Bindings, audioUrl: string, filename: string, fileSizeBytes: number) {
  return segmentsToSrt(await transcribeSegmentsWithGroq(env, audioUrl, filename, fileSizeBytes));
}

export async function transcribeSegmentsWithGroq(env: Bindings, audioUrl: string, filename: string, fileSizeBytes: number) {
  if (fileSizeBytes > GROQ_MULTIPART_ATTACHMENT_SIZE_LIMIT_BYTES) {
    throw new Error("Files over 25,000,000 bytes must be submitted as ordered provider-compatible audio chunks");
  }

  const form = new FormData();
  form.set("model", "whisper-large-v3-turbo");
  form.set("response_format", "verbose_json");

  let audioBlob: Blob | null = null;
  const audioResponse = await fetch(audioUrl, { redirect: "error" });
  if (!audioResponse.ok) {
    throw new Error(`Failed to fetch audio URL: ${audioResponse.status}`);
  }
  const contentLength = parseContentLength(audioResponse.headers.get("content-length"));
  if (contentLength !== null && contentLength > GROQ_MULTIPART_ATTACHMENT_SIZE_LIMIT_BYTES) {
    throw new Error("Fetched audio exceeds provider size limit");
  }

  audioBlob = await audioResponse.blob();
  if (audioBlob.size > GROQ_MULTIPART_ATTACHMENT_SIZE_LIMIT_BYTES) {
    throw new Error("Fetched audio exceeds provider size limit");
  }
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
    const providerError = parseGroqProviderError(text, filename);
    console.error("[Groq API Error]", {
      provider: "groq",
      status: response.status,
      statusText: response.statusText,
      payloadMode: audioBlob ? "multipart" : "url",
      ...(providerError.providerCode ? { providerCode: providerError.providerCode } : {}),
      ...(providerError.providerMessage ? { providerMessage: providerError.providerMessage } : {}),
    });
    throw new TranscriptionProviderError(response.status, `Groq Whisper request failed with status ${response.status}`, true, providerError);
  }

  return verboseJsonToSegments(JSON.parse(text) as GroqVerboseTranscription);
}

function parseContentLength(value: string | null) {
  if (value === null) return null;
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function parseGroqProviderError(bodyText: string, filename: string) {
  const parsed = parseJsonObject(bodyText);
  const errorObject = parsed && typeof parsed.error === "object" && parsed.error !== null
    ? parsed.error as Record<string, unknown>
    : parsed;
  const code = errorObject ? sanitizeProviderCode(errorObject.code) : undefined;
  const messageSource = errorObject?.message ?? errorObject?.error ?? (parsed ? undefined : bodyText);
  const message = typeof messageSource === "string" ? sanitizeProviderMessage(messageSource, filename) : undefined;
  return {
    ...(code ? { providerCode: code } : {}),
    ...(message ? { providerMessage: message } : {}),
  };
}

function parseJsonObject(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function sanitizeProviderCode(value: unknown) {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().replace(/[^\w.:-]+/g, "_").slice(0, 64);
  return normalized || undefined;
}

function sanitizeProviderMessage(value: string, filename: string) {
  const filenamePattern = escapedFilenamePattern(filename);
  let sanitized = value
    .replace(/https?:\/\/\S+/gi, "[redacted-url]")
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted-token]")
    .replace(/\bBasic\s+[A-Za-z0-9._~+/=-]+/gi, "Basic [redacted-token]")
    .replace(/\b(?:token|access_token|secret|signature|password|pwd|key|api_key|cookie|session)=([^\s&]+)/gi, (match) => {
      const name = match.split("=")[0];
      return `${name}=[redacted]`;
    })
    .replace(/\b(?:Cookie|Set-Cookie|Authorization):\s*[^\r\n; ]+(?:=[^\r\n; ]+)?/gi, (match) => `${match.split(":")[0]}: [redacted]`)
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[redacted-email]")
    .replace(/(?:^|\s)(?:\/[^\s\\/:"']+){2,}(?:\.[A-Za-z0-9]{1,12})?/g, " [redacted-path]")
    .replace(/\bX-Amz-[A-Za-z0-9-]+=[^\s&]+/gi, "X-Amz-[redacted]")
    .replace(/[^\S\r\n]+/g, " ")
    .replace(/[\r\n\t]+/g, " ")
    .trim();

  if (filenamePattern) {
    sanitized = sanitized.replace(filenamePattern, "[redacted-file]");
  }

  sanitized = sanitized.replace(/\b[^\s\\/:"']+\.(?:flac|mp3|mp4|mpeg|mpga|m4a|ogg|wav|webm|mov|qt)\b/gi, "[redacted-file]");
  sanitized = sanitized.slice(0, 180).trim();
  return sanitized || undefined;
}

function escapedFilenamePattern(filename: string) {
  const trimmed = filename.trim();
  if (!trimmed) return null;
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(escaped, "gi");
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
