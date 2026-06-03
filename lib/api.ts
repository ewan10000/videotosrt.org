export const API_BASE_URL = "https://api.videotosrt.org/api";

type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: BodyInit | Record<string, unknown> | null;
};

export type ApiUser = {
  id?: string;
  email?: string;
  name?: string;
  avatar?: string;
  image?: string;
};

export type ApiJob = {
  id?: string;
  job_id?: string;
  status?: string;
  srt?: string;
  result?: {
    srt?: string;
    subtitles?: string;
  };
  error?: string;
  message?: string;
};

export type CheckoutResponse = {
  url?: string;
  checkout_url?: string;
  sessionUrl?: string;
};

function buildUrl(path: string) {
  if (path.startsWith("http")) {
    return path;
  }

  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function authLoginUrl(provider: "google" | "github" | "email", returnTo?: string) {
  const url = new URL(`${API_BASE_URL}/auth/login`);
  url.searchParams.set("provider", provider);
  if (returnTo) {
    url.searchParams.set("returnTo", returnTo);
  }
  return url.toString();
}

export async function apiFetch<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  let body = options.body;

  if (body && !(body instanceof FormData) && !(body instanceof Blob) && typeof body !== "string") {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(body);
  }

  const response = await fetch(buildUrl(path), {
    ...options,
    body: body as BodyInit | null | undefined,
    credentials: "include",
    headers
  });

  const contentType = response.headers.get("content-type") ?? "";
  const data = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      typeof data === "object" && data && "message" in data
        ? String(data.message)
        : typeof data === "object" && data && "error" in data
          ? String(data.error)
          : "Request failed. Please try again.";
    throw new Error(message);
  }

  return data as T;
}

export const api = {
  me: () => apiFetch<{ user?: ApiUser | null } | ApiUser | null>("/auth/me"),
  logout: () => apiFetch<{ ok?: boolean }>("/auth/logout", { method: "POST" }),
  transcribe: (payload: { filename: string; audio_url: string; duration_seconds: number }) =>
    apiFetch<ApiJob>("/transcribe", { method: "POST", body: payload }),
  job: (id: string) => apiFetch<ApiJob>(`/jobs/${encodeURIComponent(id)}`),
  checkout: (plan: "pro" | "business", billing?: "monthly" | "annual") =>
    apiFetch<CheckoutResponse>("/checkout", { method: "POST", body: { plan, billing: billing ?? "monthly" } })
};
