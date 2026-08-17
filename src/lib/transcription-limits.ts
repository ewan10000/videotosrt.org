export const GROQ_MULTIPART_ATTACHMENT_SIZE_LIMIT_BYTES = 25000000;
export const PROVIDER_COMPATIBLE_TRANSCRIPTION_SIZE_LIMIT_BYTES = 100000000;

export const PROVIDER_SIZE_ERROR_CODE = "PROVIDER_FILE_SIZE_LIMIT";
export const PROVIDER_SIZE_ERROR_MESSAGE = "Transcription provider supports files up to 100,000,000 bytes";

export function parseFileSizeBytes(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) return null;
  return value;
}
