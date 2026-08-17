export const GROQ_MULTIPART_ATTACHMENT_SIZE_LIMIT_BYTES = 25000000;
export const PROVIDER_COMPATIBLE_TRANSCRIPTION_SIZE_LIMIT_BYTES = 100000000;
export const APPLICATION_TRANSCRIPTION_SIZE_LIMIT_BYTES = 300000000;

export const PROVIDER_SIZE_ERROR_CODE = "PROVIDER_FILE_SIZE_LIMIT";
export const PROVIDER_SIZE_ERROR_MESSAGE = "Files over 100,000,000 bytes must be submitted as provider-compatible audio chunks";
export const APPLICATION_SIZE_ERROR_CODE = "APPLICATION_FILE_SIZE_LIMIT";
export const APPLICATION_SIZE_ERROR_MESSAGE = "Automatic transcription supports files up to 300,000,000 bytes";

export function parseFileSizeBytes(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) return null;
  return value;
}
