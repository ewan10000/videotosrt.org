export type PlanId = "free" | "pro" | "studio";

export const PLAN_LIMITS: Record<PlanId, { maxFileMinutes: number; monthlyMinutes: number }> = {
  free: { monthlyMinutes: 60, maxFileMinutes: 60 },
  pro: { monthlyMinutes: 600, maxFileMinutes: 180 },
  studio: { monthlyMinutes: 3000, maxFileMinutes: 360 }
};

export const GROQ_MULTIPART_ATTACHMENT_SIZE_LIMIT_BYTES = 25_000_000;
export const PROVIDER_COMPATIBLE_TRANSCRIPTION_UPLOAD_BYTES = 25_000_000;
export const PROVIDER_COMPATIBLE_TRANSCRIPTION_UPLOAD_LABEL = "25 MB (25,000,000 bytes)";
export const TECHNICAL_TRANSCRIPTION_UPLOAD_BYTES = 300_000_000;
export const TECHNICAL_TRANSCRIPTION_UPLOAD_LABEL = "300 MB (300,000,000 bytes)";
export const TECHNICAL_TRANSCRIPTION_UPLOAD_MESSAGE =
  `Automatic transcription supports source files up to ${TECHNICAL_TRANSCRIPTION_UPLOAD_LABEL}. Files over ${PROVIDER_COMPATIBLE_TRANSCRIPTION_UPLOAD_LABEL}, MOV/QuickTime files, or provider-incompatible formats are prepared locally as WAV chunks no larger than ${PROVIDER_COMPATIBLE_TRANSCRIPTION_UPLOAD_LABEL}.`;

export const SUPPORTED_DIRECT_TRANSCRIPTION_EXTENSIONS = [
  "flac",
  "mp3",
  "mp4",
  "mpeg",
  "mpga",
  "m4a",
  "ogg",
  "wav",
  "webm",
] as const;

export const ACCEPTED_TRANSCRIPTION_MEDIA_INPUTS =
  "video/*,audio/*,.flac,.mp3,.mp4,.mpeg,.mpga,.m4a,.ogg,.wav,.webm,.mov,.qt";

export function isMovQuickTimeSource(file: Pick<File, "name" | "type">) {
  return /\.mov$/i.test(file.name) || /\.qt$/i.test(file.name) || file.type.toLowerCase() === "video/quicktime";
}

export function isSupportedDirectTranscriptionSource(file: Pick<File, "name" | "type">) {
  if (isMovQuickTimeSource(file)) {
    return false;
  }

  const extension = file.name.toLowerCase().match(/\.([^.]+)$/)?.[1];
  return extension ? SUPPORTED_DIRECT_TRANSCRIPTION_EXTENSIONS.includes(extension as (typeof SUPPORTED_DIRECT_TRANSCRIPTION_EXTENSIONS)[number]) : false;
}

export function shouldPreprocessForTranscription(file: Pick<File, "name" | "size" | "type">) {
  return file.size > PROVIDER_COMPATIBLE_TRANSCRIPTION_UPLOAD_BYTES || isMovQuickTimeSource(file) || !isSupportedDirectTranscriptionSource(file);
}

export function getPlanLimits(plan: PlanId) {
  return PLAN_LIMITS[plan];
}
