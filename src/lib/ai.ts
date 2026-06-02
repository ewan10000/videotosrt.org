import type { Bindings } from "../types";

export async function transcribeWithGroq(env: Bindings, audioUrl: string, filename: string) {
  const audioResponse = await fetch(audioUrl);
  if (!audioResponse.ok) {
    throw new Error(`Failed to fetch audio URL: ${audioResponse.status}`);
  }

  const audioBlob = await audioResponse.blob();
  const form = new FormData();
  form.set("model", "whisper-large-v3-turbo");
  form.set("response_format", "srt");
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
    throw new Error(`Groq Whisper request failed: ${response.status} ${text.slice(0, 300)}`);
  }

  return text;
}
