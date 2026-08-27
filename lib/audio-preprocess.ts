import { BYTES_PER_SAMPLE, OUTPUT_CHANNELS, OUTPUT_SAMPLE_RATE, planMonoPcm16WavChunks, WAV_HEADER_BYTES } from "./audio-preprocess-plan";
import { PROVIDER_COMPATIBLE_TRANSCRIPTION_UPLOAD_BYTES } from "./limits";

export type TranscriptionAudioChunk = {
  file: File;
  durationSeconds: number;
  fileSizeBytes: number;
};

export type AudioPreprocessProgress = {
  completedChunks: number;
  totalChunks: number;
  phase: "decoding" | "resampling" | "encoding";
};

export async function preprocessFileIntoAudioChunks(
  file: File,
  onProgress?: (progress: AudioPreprocessProgress) => void,
): Promise<TranscriptionAudioChunk[]> {
  const audioGlobal = globalThis as typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
    webkitOfflineAudioContext?: typeof OfflineAudioContext;
  };
  const AudioContextCtor = globalThis.AudioContext || audioGlobal.webkitAudioContext;
  const OfflineAudioContextCtor = globalThis.OfflineAudioContext || audioGlobal.webkitOfflineAudioContext;

  if (!AudioContextCtor || !OfflineAudioContextCtor) {
    throw new Error("This browser cannot prepare this media for AI transcription. Try the latest Chrome, Edge, or Safari, or extract the audio to a supported file.");
  }

  let sourceBuffer: AudioBuffer;
  try {
    onProgress?.({ phase: "decoding", completedChunks: 0, totalChunks: 1 });
    const inputBuffer = await file.arrayBuffer();
    const context = new AudioContextCtor();
    sourceBuffer = await context.decodeAudioData(inputBuffer.slice(0));
    await context.close().catch(() => undefined);
  } catch (error) {
    const message = error instanceof DOMException && error.name === "EncodingError"
      ? "This browser could not decode audio from the selected media. Upload a supported audio format such as MP3, M4A, WAV, or WebM audio, or use a smaller file."
      : "Local audio preparation failed while reading this media. Try a supported audio format or a smaller file.";
    throw new Error(message);
  }

  const frameCount = Math.ceil(sourceBuffer.duration * OUTPUT_SAMPLE_RATE);
  let rendered: AudioBuffer;
  try {
    onProgress?.({ phase: "resampling", completedChunks: 0, totalChunks: 1 });
    const offline = new OfflineAudioContextCtor(OUTPUT_CHANNELS, frameCount, OUTPUT_SAMPLE_RATE);
    const source = offline.createBufferSource();
    source.buffer = sourceBuffer;
    source.connect(offline.destination);
    source.start();
    rendered = await offline.startRendering();
  } catch {
    throw new Error("This browser could not prepare audio chunks. Try a supported audio format or a smaller file.");
  }

  const plannedChunks = planMonoPcm16WavChunks(rendered.length, OUTPUT_SAMPLE_RATE);
  const chunks: TranscriptionAudioChunk[] = [];
  const samples = rendered.getChannelData(0);

  for (const chunkPlan of plannedChunks) {
    onProgress?.({ phase: "encoding", completedChunks: chunkPlan.index, totalChunks: plannedChunks.length });
    const wav = encodeMonoPcm16Wav(samples.subarray(chunkPlan.startSample, chunkPlan.endSample), OUTPUT_SAMPLE_RATE);
    if (wav.size > PROVIDER_COMPATIBLE_TRANSCRIPTION_UPLOAD_BYTES) {
      throw new Error("Prepared audio chunk exceeded the provider limit. Try a supported audio format or a smaller file.");
    }
    chunks.push({
      file: new File([wav], `${safeBaseName(file.name)}.chunk-${String(chunkPlan.index + 1).padStart(3, "0")}.wav`, { type: "audio/wav" }),
      durationSeconds: chunkPlan.durationSeconds,
      fileSizeBytes: wav.size,
    });
  }

  onProgress?.({ phase: "encoding", completedChunks: plannedChunks.length, totalChunks: plannedChunks.length });

  if (chunks.length === 0) {
    throw new Error("No usable audio was found while preparing this file for transcription.");
  }

  return chunks;
}

function safeBaseName(name: string) {
  return (name.replace(/\.[^.]+$/, "").replace(/[^\w.+-]/g, "_").slice(0, 80) || "audio");
}

function encodeMonoPcm16Wav(samples: Float32Array, sampleRate: number) {
  const dataBytes = samples.length * BYTES_PER_SAMPLE;
  const buffer = new ArrayBuffer(WAV_HEADER_BYTES + dataBytes);
  const view = new DataView(buffer);
  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, OUTPUT_CHANNELS, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * OUTPUT_CHANNELS * BYTES_PER_SAMPLE, true);
  view.setUint16(32, OUTPUT_CHANNELS * BYTES_PER_SAMPLE, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, dataBytes, true);

  let offset = WAV_HEADER_BYTES;
  for (const sample of samples) {
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += BYTES_PER_SAMPLE;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

function writeAscii(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}
