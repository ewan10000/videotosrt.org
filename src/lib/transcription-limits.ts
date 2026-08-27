export const GROQ_MULTIPART_ATTACHMENT_SIZE_LIMIT_BYTES = 25000000;
export const PROVIDER_COMPATIBLE_TRANSCRIPTION_SIZE_LIMIT_BYTES = 25000000;
export const APPLICATION_TRANSCRIPTION_SIZE_LIMIT_BYTES = 300000000;
export const MAX_TRANSCRIPTION_CHUNKS = 64;

export const PROVIDER_SIZE_ERROR_CODE = "PROVIDER_FILE_SIZE_LIMIT";
export const PROVIDER_SIZE_ERROR_MESSAGE = "Files over 25,000,000 bytes must be submitted as ordered provider-compatible audio chunks";
export const APPLICATION_SIZE_ERROR_CODE = "APPLICATION_FILE_SIZE_LIMIT";
export const APPLICATION_SIZE_ERROR_MESSAGE = "Automatic transcription supports files up to 300,000,000 bytes";
export const UNSUPPORTED_SOURCE_FORMAT_ERROR_CODE = "UNSUPPORTED_TRANSCRIPTION_SOURCE_FORMAT";
export const UNSUPPORTED_SOURCE_FORMAT_ERROR_MESSAGE = "MOV/QuickTime and unsupported source containers must be submitted as ordered provider-compatible audio chunks";

const GROQ_SUPPORTED_DIRECT_EXTENSIONS = new Set(["flac", "mp3", "mp4", "mpeg", "mpga", "m4a", "ogg", "wav", "webm"]);

export function isGroqDirectSourceFormatSupported(filename: string) {
  const trimmed = filename.trim();
  const lastPathPart = trimmed.split(/[\\/]/).pop() ?? trimmed;
  const extensionMatch = /\.([A-Za-z0-9]+)$/.exec(lastPathPart);
  if (!extensionMatch) return true;
  return GROQ_SUPPORTED_DIRECT_EXTENSIONS.has(extensionMatch[1].toLowerCase());
}

export function parseFileSizeBytes(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) return null;
  return value;
}
