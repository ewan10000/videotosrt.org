export type Bindings = {
  DB: D1Database;
  AI_QUEUE: Queue<TranscriptionQueueMessage>;
  ASSETS: Fetcher;
  SITE_NAME: string;
  APP_ORIGIN: string;
  AI_PROVIDER: string;
  PAYMENT_PROVIDER: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REDIRECT_URI: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  GITHUB_REDIRECT_URI: string;
  SESSION_SECRET: string;
  GROQ_API_KEY: string;
  CREEM_API_KEY: string;
  CREEM_WEBHOOK_SECRET: string;
};

export type AppVariables = {
  user: User | null;
};

export type HonoAppEnv = {
  Bindings: Bindings;
  Variables: AppVariables;
};

export type User = {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  provider: string;
  provider_id: string;
  created_at: string;
  updated_at: string;
};

export type TranscriptionJob = {
  id: string;
  user_id: string;
  status: "queued" | "processing" | "completed" | "failed";
  filename: string;
  audio_url: string;
  srt_content: string | null;
  duration_seconds: number;
  created_at: string;
  updated_at: string;
};

export type TranscriptionQueueMessage = {
  jobId: string;
  userId: string;
  audioUrl: string;
  filename: string;
  durationSeconds: number;
};
