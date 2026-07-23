"use client";

export type ConversionEventName =
  | "landing_page_view"
  | "upload_clicked"
  | "file_selected"
  | "file_rejected"
  | "sign_in_started"
  | "sign_in_completed"
  | "transcription_started"
  | "transcription_completed"
  | "transcription_failed"
  | "editor_opened"
  | "export_started"
  | "download_initiated"
  | "pricing_viewed"
  | "checkout_intent"
  | "checkout_started"
  | "checkout_completed"
  | "checkout_failed";

type EventProperties = Record<string, boolean | number | string | null | undefined>;

const ANONYMOUS_ID_KEY = "videotosrt.analytics.anonymous_id";

function getAnonymousId() {
  let id = window.localStorage.getItem(ANONYMOUS_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(ANONYMOUS_ID_KEY, id);
  }
  return id;
}

function safePath() {
  const url = new URL(window.location.href);
  return url.pathname;
}

export function trackConversionEvent(name: ConversionEventName, properties: EventProperties = {}) {
  if (typeof window === "undefined") {
    return;
  }

  const payload = {
    anonymousId: getAnonymousId(),
    event: name,
    path: safePath(),
    properties
  };

  const body = JSON.stringify(payload);
  const endpoint = "/api/events";

  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: "application/json" });
    if (navigator.sendBeacon(endpoint, blob)) {
      return;
    }
  }

  void fetch(endpoint, {
    body,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    keepalive: true,
    method: "POST"
  }).catch(() => undefined);
}
