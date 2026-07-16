import { getSessionToken } from "@/lib/auth";

export const API_BASE_URL = "/api";

type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: BodyInit | Record<string, unknown> | null;
  timeoutMs?: number;
};

export type ApiUser = {
  id?: string;
  email?: string;
  name?: string;
  username?: string;
  display_name?: string;
  full_name?: string;
  avatar?: string;
  image?: string;
  plan?: string;
  role?: string;
  subscription_plan?: string;
  subscription_status?: string;
  subscription_tier?: string;
  tier?: string;
  vip_level?: string;
  extra_credit_hours?: number;
};

export type ApiJob = {
  data?: ApiJob;
  id?: string;
  job_id?: string;
  ok?: boolean;
  status?: string;
  srt?: string;
  srt_content?: string;
  subtitles?: string;
  result?: {
    content?: string;
    output?: string;
    srt?: string;
    srt_content?: string;
    subtitles?: string;
    text?: string;
    transcript?: string;
    vtt?: string;
  };
  content?: string;
  error?: string;
  message?: string;
  output?: string;
  text?: string;
  transcript?: string;
  vtt?: string;
};

export type CheckoutResponse = {
  approvalUrl?: string;
  hours?: number;
  id?: string;
  provider?: string;
  url?: string;
  checkout_url?: string;
  sessionUrl?: string;
};

export type PaypalSyncResponse = {
  ok?: boolean;
  plan?: "free" | "pro" | "studio";
  subscriptionId?: string;
  update?: string;
  user?: ApiUser | null;
};

export type CreditsCaptureResponse = {
  applied?: boolean;
  credits?: "2h" | "5h" | "20h";
  hours?: number;
  ok?: boolean;
  status?: string;
  update?: string;
  user?: ApiUser | null;
};

export type UploadResponse = {
  audio_url?: string;
  data?: UploadResponse;
  file_url?: string;
  public_url?: string;
  url?: string;
};

export type ApiUserResponse =
  | ApiUser
  | {
      data?: {
        user?: ApiUser | null;
      } | null;
      user?: ApiUser | null;
    }
  | null;

function buildUrl(path: string) {
  if (path.startsWith("http")) {
    return path;
  }

  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function authLoginUrl(provider: "google", returnTo?: string) {
  const origin = typeof window === "undefined" ? "https://videotosrt.org" : window.location.origin;
  const url = new URL(`${API_BASE_URL}/auth/login`, origin);
  const completeUrl = new URL("/auth/complete", origin);

  completeUrl.searchParams.set("authTs", String(Date.now()));
  url.searchParams.set("provider", provider);
  if (returnTo) {
    completeUrl.searchParams.set("returnTo", returnTo);
  }
  url.searchParams.set("returnTo", completeUrl.toString());

  return url.toString();
}

export async function apiFetch<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { timeoutMs, ...requestOptions } = options;
  const headers = new Headers(options.headers);
  const sessionToken = getSessionToken();
  let body = options.body;
  const controller = timeoutMs ? new AbortController() : null;
  const timeout = controller ? globalThis.setTimeout(() => controller.abort(), timeoutMs) : null;

  if (sessionToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${sessionToken}`);
  }

  if (body && !(body instanceof FormData) && !(body instanceof Blob) && typeof body !== "string") {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(body);
  }

  let response: Response;

  try {
    response = await fetch(buildUrl(path), {
      ...requestOptions,
      body: body as BodyInit | null | undefined,
      credentials: "include",
      headers,
      signal: controller?.signal ?? requestOptions.signal
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Upload timed out. Please try a smaller or shorter file.");
    }
    throw error;
  } finally {
    if (timeout) {
      globalThis.clearTimeout(timeout);
    }
  }

  const contentType = response.headers.get("content-type") ?? "";
  const data = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    const nestedError =
      typeof data === "object" && data && "error" in data && typeof data.error === "object" && data.error
        ? data.error as { code?: unknown; message?: unknown }
        : null;
    const message =
      nestedError?.message
        ? String(nestedError.message)
        : nestedError?.code
          ? String(nestedError.code)
          : typeof data === "object" && data && "message" in data
            ? String(data.message)
            : typeof data === "object" && data && "error" in data
              ? String(data.error)
              : "Request failed. Please try again.";
    throw new Error(message);
  }

  return data as T;
}

export const api = {
  me: () => apiFetch<ApiUserResponse>("/auth/me"),
  logout: () => apiFetch<{ ok?: boolean }>("/auth/logout", { method: "POST" }),
  upload: (file: File) => {
    const body = new FormData();
    body.set("file", file);
    return apiFetch<UploadResponse>("/upload", { method: "POST", body, timeoutMs: 120000 });
  },
  transcribe: (payload: { filename: string; audio_url: string; duration_seconds: number }) =>
    apiFetch<ApiJob>("/transcribe", { method: "POST", body: payload }),
  job: (id: string) => apiFetch<ApiJob>(`/jobs/${encodeURIComponent(id)}`),
  checkout: (plan: "pro" | "studio", billing: "monthly" | "yearly") =>
    apiFetch<CheckoutResponse>("/checkout/paypal", { method: "POST", body: { billing, plan } }),
  syncPaypalSubscription: (payload: { billing?: "monthly" | "yearly"; plan?: "pro" | "studio"; subscriptionId: string }) =>
    apiFetch<PaypalSyncResponse>("/checkout/paypal/sync", { method: "POST", body: payload }),
  checkoutCredits: (credits: "2h" | "5h" | "20h") =>
    apiFetch<CheckoutResponse>("/checkout/paypal/credits", { method: "POST", body: { credits } }),
  captureCredits: (orderId: string) =>
    apiFetch<CreditsCaptureResponse>("/checkout/paypal/credits/capture", { method: "POST", body: { orderId } })
};
