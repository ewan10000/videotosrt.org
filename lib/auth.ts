"use client";

import type { ApiUser, ApiUserResponse } from "@/lib/api";

const AUTH_USER_KEY = "videotosrt.auth.user";
const AUTH_SESSION_TOKEN_KEY = "videotosrt.auth.session_token";
const AUTH_CHANGE_EVENT = "videotosrt:auth-change";
const SESSION_COOKIE = "vts_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type AuthUserResponse = ApiUserResponse;

export function normalizeUser(data: AuthUserResponse): ApiUser | null {
  if (!data) {
    return null;
  }

  if ("user" in data) {
    return data.user ?? null;
  }

  if ("data" in data) {
    return data.data?.user ?? null;
  }

  return data as ApiUser;
}

export function getUserDisplayName(user: ApiUser | null) {
  if (!user) {
    return "";
  }

  return user.name ?? user.username ?? user.display_name ?? user.full_name ?? user.email ?? "Signed in";
}

export function getLocalUser(): ApiUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.localStorage.getItem(AUTH_USER_KEY);
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as ApiUser;
  } catch {
    window.localStorage.removeItem(AUTH_USER_KEY);
    return null;
  }
}

export function getSessionToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(AUTH_SESSION_TOKEN_KEY) ?? "";
}

export function clearSessionToken() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(AUTH_SESSION_TOKEN_KEY);
  document.cookie = `${SESSION_COOKIE}=; Path=/; Max-Age=0; Secure; SameSite=None`;
}

export function consumeSessionTokenFromLocation() {
  if (typeof window === "undefined") {
    return false;
  }

  const rawHash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
  if (!rawHash) {
    return false;
  }

  const params = new URLSearchParams(rawHash);
  const token = params.get("token");
  if (!token) {
    return false;
  }

  window.localStorage.setItem(AUTH_SESSION_TOKEN_KEY, token);
  document.cookie = `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${SESSION_MAX_AGE_SECONDS}; Secure; SameSite=None`;

  params.delete("token");
  const cleanedUrl = new URL(window.location.href);
  const nextHash = params.toString();
  cleanedUrl.hash = nextHash ? `#${nextHash}` : "";
  window.history.replaceState(window.history.state, "", cleanedUrl.toString());

  return true;
}

export function setLocalUser(user: ApiUser | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (user) {
    window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  } else {
    window.localStorage.removeItem(AUTH_USER_KEY);
  }

  window.dispatchEvent(new CustomEvent<ApiUser | null>(AUTH_CHANGE_EVENT, { detail: user }));
}

export function onAuthChange(callback: (user: ApiUser | null) => void) {
  function handleChange(event: Event) {
    callback((event as CustomEvent<ApiUser | null>).detail ?? getLocalUser());
  }

  window.addEventListener(AUTH_CHANGE_EVENT, handleChange);

  return () => window.removeEventListener(AUTH_CHANGE_EVENT, handleChange);
}
