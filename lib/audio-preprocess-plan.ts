export const OUTPUT_SAMPLE_RATE = 16_000;
export const OUTPUT_CHANNELS = 1;
export const BYTES_PER_SAMPLE = 2;
export const WAV_HEADER_BYTES = 44;
export const TARGET_CHUNK_BYTES = 20_000_000;
export const MAX_TRANSCRIPTION_AUDIO_CHUNKS = 64;

export type PlannedWavChunk = {
  index: number;
  startSample: number;
  endSample: number;
  durationSeconds: number;
  fileSizeBytes: number;
};

export function getMonoPcm16SamplesPerChunk(targetBytes = TARGET_CHUNK_BYTES) {
  return Math.floor((targetBytes - WAV_HEADER_BYTES) / BYTES_PER_SAMPLE);
}

export function planMonoPcm16WavChunks(sampleCount: number, sampleRate: number): PlannedWavChunk[] {
  const samplesPerChunk = getMonoPcm16SamplesPerChunk();
  const totalChunks = Math.ceil(sampleCount / samplesPerChunk);
  if (totalChunks > MAX_TRANSCRIPTION_AUDIO_CHUNKS) {
    throw new Error("This file would require more than 64 audio chunks after local preparation. Try a supported audio format or a smaller file.");
  }

  const chunks: PlannedWavChunk[] = [];
  for (let index = 0; index < totalChunks; index += 1) {
    const startSample = index * samplesPerChunk;
    const endSample = Math.min(startSample + samplesPerChunk, sampleCount);
    chunks.push({
      index,
      startSample,
      endSample,
      durationSeconds: (endSample - startSample) / sampleRate,
      fileSizeBytes: WAV_HEADER_BYTES + (endSample - startSample) * BYTES_PER_SAMPLE,
    });
  }

  return chunks;
}
